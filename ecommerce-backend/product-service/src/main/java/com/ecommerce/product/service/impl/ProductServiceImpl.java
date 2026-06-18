package com.ecommerce.product.service.impl;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.VariantPayload;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.dto.response.VariantResponse;
import com.ecommerce.product.entity.AttributeType;
import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.CategoryAttribute;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ProductImage;
import com.ecommerce.product.entity.ProductStatus;
import com.ecommerce.product.entity.ProductVariant;
import com.ecommerce.product.exception.NotFoundException;
import com.ecommerce.product.kafka.event.ProductCreatedEvent;
import com.ecommerce.product.kafka.producer.ProductEventProducer;
import com.ecommerce.product.repository.*;
import com.ecommerce.product.service.ImageUploadService;
import com.ecommerce.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductReviewRepository productReviewRepository;
    private final CategoryAttributeRepository categoryAttributeRepository;
    private final CommissionRateRepository commissionRateRepository;
    private final com.ecommerce.product.repository.ProductElasticsearchRepository productElasticsearchRepository;

    private final ImageUploadService imageUploadService;
    private final ProductEventProducer productEventProducer;

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "products", allEntries = true),
            @CacheEvict(value = "categories", allEntries = true)
    })
    public ProductResponse createProduct(ProductCreateRequest request, String sellerId) {
        log.info("Bắt đầu tạo sản phẩm mới từ Seller: {}", sellerId);

        // 1. Kiểm tra Danh mục có tồn tại thật hay không?
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Danh mục không tồn tại!"));

        // 1.1 Validate giá trị attribute theo schema của danh mục
        Map<String, Object> validatedAttributes = validateAndNormalizeAttributes(
                request.getCategoryId(), request.getAttributes());

        // 2. Map dữ liệu từ Request (khách nhập) sang Entity (Để lưu DB)
        Product newProduct = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stock(request.getStock())
                .sellerId(sellerId)
                .category(category)
                .status(request.getStatus())
                .ratingAvg(BigDecimal.ZERO)
                .ratingCount(0)
                .discountPercent(0)
                .verified(false)
                .attributes(validatedAttributes)
                .weightG(request.getWeightG() != null ? request.getWeightG() : 500)
                .lengthCm(request.getLengthCm() != null ? request.getLengthCm() : 20)
                .widthCm(request.getWidthCm() != null ? request.getWidthCm() : 15)
                .heightCm(request.getHeightCm() != null ? request.getHeightCm() : 10)
                .build();

        // 3. (DATABASE) Lưu Sản phẩm xuống đĩa cứng PostgreSQL
        Product savedProduct = productRepository.save(newProduct);

        // 3.1 Lưu các biến thể (nếu có)
        boolean hasVariants = request.getVariants() != null && !request.getVariants().isEmpty();
        if (hasVariants) {
            for (VariantPayload payload : request.getVariants()) {
                productVariantRepository.save(buildVariantEntity(savedProduct, payload, null));
            }
        }

        // 4. (KAFKA) Nếu Sản phẩm đăng lên là ACTIVE, bắn tin nhắn rủ mọi người đi mua
        if (savedProduct.getStatus() == ProductStatus.ACTIVE) {
            ProductCreatedEvent event = ProductCreatedEvent.builder()
                    .productId(savedProduct.getId())
                    .name(savedProduct.getName())
                    .price(savedProduct.getPrice())
                    .sellerId(sellerId)
                    .build();

            productEventProducer.sendProductCreatedEvent(event);
        }

        // Reload để collection variants được fill khi map response
        Product refreshed = hasVariants
                ? productRepository.findById(savedProduct.getId()).orElse(savedProduct)
                : savedProduct;
        return mapToProductResponse(refreshed);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "product", key = "#productId"),
            @CacheEvict(value = "products", allEntries = true)
    })
    public List<String> uploadProductImages(String productId, List<MultipartFile> files, String sellerId, boolean replace) {
        // 1. Kiểm tra SP có thật không và có phải của chính Seller này không?
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại!"));

        if (!product.getSellerId().equals(sellerId)) {
            throw new RuntimeException("Bạn không có quyền up ảnh cho sản phẩm của người khác!");
        }

        List<String> uploadedUrls = new ArrayList<>();

        // 2. Upload tất cả lên S3 trước, nếu lỗi thì rollback các file đã upload
        for (MultipartFile file : files) {
            try {
                String imageUrl = imageUploadService.uploadImage(file);
                uploadedUrls.add(imageUrl);
            } catch (Exception e) {
                log.error("Lỗi khi upload ảnh cho sản phẩm {}: {}", productId, e.getMessage());
                // Rollback: xóa các file đã upload lên S3 trước đó
                for (String uploadedUrl : uploadedUrls) {
                    try {
                        imageUploadService.deleteImage(uploadedUrl);
                    } catch (Exception deleteEx) {
                        log.warn("Không thể xóa ảnh rác trên S3: {}", uploadedUrl);
                    }
                }
                throw new RuntimeException("Tải ảnh thất bại tại file " + file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        // 3. Replace mode: xoá hết ảnh cũ (DB + S3) trước khi lưu ảnh mới.
        // Chỉ chạy SAU khi upload thành công để tránh trường hợp xoá hết ảnh cũ
        // nhưng upload mới lại fail → sản phẩm trống ảnh.
        if (replace) {
            List<ProductImage> oldImages = productImageRepository.findByProductId(productId);
            for (ProductImage old : oldImages) {
                try {
                    imageUploadService.deleteImage(old.getImageUrl());
                } catch (Exception ex) {
                    log.warn("Không xoá được ảnh cũ trên S3: {}", old.getImageUrl());
                }
            }
            productImageRepository.deleteAll(oldImages);
        }

        boolean isFirstImage = productImageRepository.findByProductId(productId).isEmpty();

        // 4. Chỉ lưu DB sau khi TẤT CẢ upload S3 thành công
        for (String imageUrl : uploadedUrls) {
            ProductImage productImage = ProductImage.builder()
                    .product(product)
                    .imageUrl(imageUrl)
                    .isMain(isFirstImage)
                    .build();
            productImageRepository.save(productImage);
            isFirstImage = false;
        }
        return uploadedUrls;
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "product", key = "#productId")
    public ProductResponse getProductById(String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        return mapToProductResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> filterAndSearchProducts(String keyword, String categoryId, String sellerId, Double minPrice, Double maxPrice, Integer minRating, Pageable pageable) {
        log.info("Tìm kiếm sản phẩm với keyword: {}, categoryId: {}, sellerId: {}, price: {} - {}, minRating: {}", keyword, categoryId, sellerId, minPrice, maxPrice, minRating);

        // 1. NẾU CÓ KEYWORD -> TÌM BẰNG ELASTICSEARCH (Fuzzy Search siêu tốc)
        if (keyword != null && !keyword.trim().isEmpty()) {
            log.info("=> Bẻ lái truy vấn sang Elasticsearch (CQRS Pattern)...");
            Page<com.ecommerce.product.document.ProductDocument> esPage = productElasticsearchRepository.searchByNameFuzzyAndActive(keyword, pageable);
            
            List<String> productIds = esPage.getContent().stream()
                    .map(com.ecommerce.product.document.ProductDocument::getId)
                    .collect(Collectors.toList());
            
            if (productIds.isEmpty()) {
                return Page.empty(pageable);
            }
            
            // Lấy Data Full từ PostgresSQL theo list ID trả về từ ES
            List<Product> productsFromDb = productRepository.findAllById(productIds);
            
            // Map lại để giữ nguyên thứ tự Ranking xịn xò của Elasticsearch
            Map<String, Product> productMap = productsFromDb.stream()
                    .collect(Collectors.toMap(Product::getId, p -> p));
            
            List<ProductResponse> responses = productIds.stream()
                    .filter(productMap::containsKey)
                    .map(id -> mapToProductResponse(productMap.get(id)))
                    .collect(Collectors.toList());
                    
            return new org.springframework.data.domain.PageImpl<>(responses, pageable, esPage.getTotalElements());
        }

        // 2. NẾU KHÔNG CÓ KEYWORD (chỉ lọc theo danh mục/giá...) -> TÌM TRONG POSTGRESQL NHƯ CŨ
        BigDecimal min = minPrice != null ? BigDecimal.valueOf(minPrice) : null;
        BigDecimal max = maxPrice != null ? BigDecimal.valueOf(maxPrice) : null;
        BigDecimal rating = minRating != null ? BigDecimal.valueOf(minRating) : null;

        Page<Product> productPage = productRepository.searchProducts(
                null, // Bỏ keyword vì đã check ở trên
                categoryId,
                sellerId,
                ProductStatus.ACTIVE,
                min,
                max,
                rating,
                pageable
        );

        return productPage.map(this::mapToProductResponse);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "product", key = "#productId"),
            @CacheEvict(value = "products", allEntries = true)
    })
    public void deleteProduct(String productId, String sellerId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại!"));

        if (!product.getSellerId().equals(sellerId)) {
            throw new RuntimeException("Không có quyền xóa!");
        }

        // Chuyển trạng thái sang DISABLED thay vì xóa cứng (Hard Delete) để giữ lịch sử mua hàng
        product.setStatus(ProductStatus.DISABLED);
        productRepository.save(product);

        log.info("Sản phẩm {} đã bị Seller {} đóng cửa", productId, sellerId);
    }

    private ProductResponse mapToProductResponse(Product product) {
        List<String> imageUrls = product.getImages() != null ?
                product.getImages().stream().map(ProductImage::getImageUrl).collect(Collectors.toList()) :
                new ArrayList<>();

        List<VariantResponse> variants = product.getVariants() != null ?
                product.getVariants().stream().map(v -> VariantResponse.builder()
                        .id(v.getId())
                        .color(v.getColor() != null ? v.getColor() : v.getName())
                        .size(v.getSize())
                        .additionalPrice(v.getPrice().subtract(product.getPrice()))
                        .stock(v.getStock())
                        .build()
                ).collect(Collectors.toList()) :
                new ArrayList<>();

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stock(product.getStock())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : "Không xác định")
                .variants(variants)
                .ratingAvg(product.getRatingAvg())
                .ratingCount(product.getRatingCount())
                .soldCount(product.getSoldCount() != null ? product.getSoldCount() : 0)
                .discountPercent(product.getDiscountPercent())
                .verified(product.getVerified())
                .status(product.getStatus())
                .createdAt(product.getCreatedAt() != null ? java.time.LocalDate.from(product.getCreatedAt()) : null)
                .images(imageUrls)
                .sellerId(product.getSellerId())
                .attributes(product.getAttributes() != null ? product.getAttributes() : new HashMap<>())
                .weightG(product.getWeightG())
                .lengthCm(product.getLengthCm())
                .widthCm(product.getWidthCm())
                .heightCm(product.getHeightCm())
                .build();
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "product", key = "#productId"),
            @CacheEvict(value = "products", allEntries = true)
    })
    public ProductResponse updateProduct(String productId, ProductUpdateRequest request, String sellerId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tìm thấy!"));

        if (!product.getSellerId().equals(sellerId)) {
            throw new RuntimeException("Bạn không được phép sửa hàng của Shop khác!");
        }

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Danh mục mới không tồn tại!"));
            product.setCategory(category);
        }

        // Cập nhật các trường
        if (request.getName() != null) product.setName(request.getName());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getStock() != null) product.setStock(request.getStock());
        if (request.getStatus() != null) product.setStatus(request.getStatus());
        if (request.getWeightG() != null) product.setWeightG(request.getWeightG());
        if (request.getLengthCm() != null) product.setLengthCm(request.getLengthCm());
        if (request.getWidthCm() != null) product.setWidthCm(request.getWidthCm());
        if (request.getHeightCm() != null) product.setHeightCm(request.getHeightCm());

        // Nếu seller gửi attributes (kể cả map rỗng) hoặc đổi danh mục → validate & ghi đè
        boolean categoryChanged = request.getCategoryId() != null
                && !request.getCategoryId().equals(product.getCategory().getId());
        if (request.getAttributes() != null || categoryChanged) {
            Map<String, Object> incoming = request.getAttributes() != null
                    ? request.getAttributes()
                    : product.getAttributes();
            Map<String, Object> validated = validateAndNormalizeAttributes(
                    product.getCategory().getId(), incoming);
            product.setAttributes(validated);
        }

        Product savedProduct = productRepository.save(product);

        // Đồng bộ danh sách variant nếu request có truyền — merge theo id, xóa các id không còn
        if (request.getVariants() != null) {
            syncVariants(savedProduct, request.getVariants());
            savedProduct = productRepository.findById(savedProduct.getId()).orElse(savedProduct);
        }

        return mapToProductResponse(savedProduct);
    }

    /**
     * Đồng bộ variant theo payload từ frontend:
     *  - id trùng với variant hiện có  → update
     *  - không có id (hoặc id rỗng)    → tạo mới
     *  - variant cũ không nằm trong payload → xóa
     */
    private void syncVariants(Product product, List<VariantPayload> incoming) {
        List<ProductVariant> existing = productVariantRepository.findByProductId(product.getId());
        Map<String, ProductVariant> byId = existing.stream()
                .collect(Collectors.toMap(ProductVariant::getId, v -> v));

        Set<String> keepIds = new HashSet<>();
        for (VariantPayload payload : incoming) {
            ProductVariant target = (payload.getId() != null && byId.containsKey(payload.getId()))
                    ? byId.get(payload.getId())
                    : null;
            ProductVariant entity = buildVariantEntity(product, payload, target);
            ProductVariant saved = productVariantRepository.save(entity);
            keepIds.add(saved.getId());
        }

        for (ProductVariant old : existing) {
            if (!keepIds.contains(old.getId())) {
                productVariantRepository.delete(old);
            }
        }
    }

    private ProductVariant buildVariantEntity(Product product, VariantPayload payload, ProductVariant existing) {
        String color = payload.getColor() != null ? payload.getColor().trim() : null;
        String size = payload.getSize() != null ? payload.getSize().trim() : null;
        if ((color == null || color.isEmpty()) && (size == null || size.isEmpty())) {
            throw new RuntimeException("Biến thể phải có ít nhất một trong hai: màu hoặc size");
        }

        String label;
        if (color != null && !color.isEmpty() && size != null && !size.isEmpty()) {
            label = color + " " + size;
        } else if (color != null && !color.isEmpty()) {
            label = color;
        } else {
            label = size;
        }

        BigDecimal additional = payload.getAdditionalPrice() != null
                ? payload.getAdditionalPrice() : BigDecimal.ZERO;
        BigDecimal price = product.getPrice().add(additional);
        int stock = payload.getStock() != null ? payload.getStock() : 0;

        ProductVariant entity = existing != null ? existing : ProductVariant.builder().build();
        entity.setProduct(product);
        entity.setName(label);
        entity.setColor(color == null || color.isEmpty() ? null : color);
        entity.setSize(size == null || size.isEmpty() ? null : size);
        entity.setPrice(price);
        entity.setStock(stock);
        return entity;
    }

    /**
     * Validate giá trị attribute theo schema do admin cấu hình cho danh mục.
     * - Bỏ qua các key không có trong schema (chống dữ liệu rác).
     * - Required: phải có giá trị không rỗng.
     * - NUMBER: phải parse được sang số.
     */
    private Map<String, Object> validateAndNormalizeAttributes(String categoryId, Map<String, Object> input) {
        List<CategoryAttribute> schema = categoryAttributeRepository
                .findByCategoryIdOrderByDisplayOrderAsc(categoryId);
        if (schema.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, Object> incoming = input != null ? input : new HashMap<>();
        Map<String, Object> result = new HashMap<>();
        Set<String> schemaKeys = new HashSet<>();

        for (CategoryAttribute attr : schema) {
            schemaKeys.add(attr.getName());
            Object rawValue = incoming.get(attr.getName());
            boolean isEmpty = rawValue == null
                    || (rawValue instanceof String s && s.trim().isEmpty());

            if (isEmpty) {
                if (Boolean.TRUE.equals(attr.getRequired())) {
                    throw new RuntimeException("Trường '" + attr.getLabel() + "' là bắt buộc");
                }
                continue;
            }

            if (attr.getType() == AttributeType.NUMBER) {
                try {
                    if (rawValue instanceof Number n) {
                        result.put(attr.getName(), n);
                    } else {
                        result.put(attr.getName(), new java.math.BigDecimal(rawValue.toString().trim()));
                    }
                } catch (NumberFormatException ex) {
                    throw new RuntimeException("Trường '" + attr.getLabel() + "' phải là số");
                }
            } else {
                // TEXT / TEXTAREA: lưu nguyên dạng chuỗi đã trim
                result.put(attr.getName(), rawValue.toString().trim());
            }
        }

        return result;
    }

    @Override
    public void createVariant(String productId, com.ecommerce.product.dto.request.VariantRequest request, String sellerId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tìm thấy!"));

        if (!product.getSellerId().equals(sellerId)) {
            throw new RuntimeException("Chỉ chủ Shop mới được thêm biến thể");
        }

        com.ecommerce.product.entity.ProductVariant variant = com.ecommerce.product.entity.ProductVariant.builder()
                .product(product)
                .name(request.getName())
                .price(request.getPrice() != null ? request.getPrice() : product.getPrice())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .sku(request.getSku())
                .build();

        // Cần có productVariantRepository.save(variant) (Bạn nhớ Inject Repository Variant vào đây nhé)
        productVariantRepository.save(variant);
    }

    @Override
    @Transactional
    public void createReview(String productId, com.ecommerce.product.dto.request.ReviewRequest request, String userId) {
        // Dùng Pessimistic Lock để tránh race condition khi 2 review được submit cùng lúc
        Product product = productRepository.findByIdWithLock(productId)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại!"));

        String reviewText = request.getReviewText() != null ? request.getReviewText().trim() : "";

        // Tạo Entity Nhận xét
        com.ecommerce.product.entity.ProductReview review = com.ecommerce.product.entity.ProductReview.builder()
                .product(product)
                .userId(userId)
                .rating(request.getRating())
                .reviewText(reviewText)
                .build();
                
        // Xử lý hình ảnh (nếu có)
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            java.util.List<com.ecommerce.product.entity.ReviewImage> images = new java.util.ArrayList<>();
            for (String url : request.getImageUrls()) {
                com.ecommerce.product.entity.ReviewImage img = new com.ecommerce.product.entity.ReviewImage();
                img.setImageUrl(url);
                img.setReview(review);
                images.add(img);
            }
            review.setReviewImages(images);
        }
        
        productReviewRepository.save(review);

        // Tự động tính toán lại Điểm trung bình (Rating Average) cho toàn bộ sản phẩm
        int currentCount = product.getRatingCount() == null ? 0 : product.getRatingCount();
        BigDecimal currentAvg = product.getRatingAvg() == null ? BigDecimal.ZERO : product.getRatingAvg();

        // Trung bình cộng Rate
        BigDecimal newTotalScore = currentAvg.multiply(BigDecimal.valueOf(currentCount)).add(BigDecimal.valueOf(request.getRating()));
        int newCount = currentCount + 1;
        BigDecimal newAvg = newTotalScore.divide(BigDecimal.valueOf(newCount), 2, java.math.RoundingMode.HALF_UP);

        product.setRatingCount(newCount);
        product.setRatingAvg(newAvg);
        productRepository.save(product);
    }

    @Override
    public com.ecommerce.product.dto.response.StockCheckResponse checkStock(
            com.ecommerce.product.dto.request.StockCheckRequest request) {

        java.util.List<com.ecommerce.product.dto.response.StockCheckResponse.OutOfStockItem> outOfStock = new java.util.ArrayList<>();
        java.util.Map<String, Double> commissionRates = new java.util.HashMap<>();

        if (request.getItems() == null) {
            return com.ecommerce.product.dto.response.StockCheckResponse.builder()
                    .available(true).outOfStockItems(outOfStock).commissionRates(commissionRates).build();
        }

        for (com.ecommerce.product.dto.request.StockCheckRequest.StockCheckItem item : request.getItems()) {
            if (item.getVariantId() != null && !item.getVariantId().isEmpty()) {
                java.util.Optional<com.ecommerce.product.entity.ProductVariant> variantOpt = productVariantRepository.findById(item.getVariantId());
                if (variantOpt.isPresent()) {
                    com.ecommerce.product.entity.ProductVariant variant = variantOpt.get();
                    if (variant.getStock() < item.getQuantity()) {
                        outOfStock.add(com.ecommerce.product.dto.response.StockCheckResponse.OutOfStockItem.builder()
                                .productId(item.getProductId())
                                .variantId(item.getVariantId())
                                .productName(variant.getProduct() != null ? variant.getProduct().getName() : item.getProductId())
                                .requested(item.getQuantity())
                                .available(variant.getStock())
                                .build());
                    }
                    if (variant.getProduct() != null && variant.getProduct().getCategory() != null) {
                        String categoryId = variant.getProduct().getCategory().getId();
                        double rate = commissionRateRepository.findById(categoryId)
                                .map(com.ecommerce.product.entity.CommissionRate::getRate).orElse(5.0);
                        commissionRates.put(item.getProductId(), rate);
                    }
                } else {
                    outOfStock.add(com.ecommerce.product.dto.response.StockCheckResponse.OutOfStockItem.builder()
                            .productId(item.getProductId())
                            .variantId(item.getVariantId())
                            .productName("Sản phẩm không còn tồn tại")
                            .requested(item.getQuantity())
                            .available(0)
                            .build());
                }
            } else {
                java.util.Optional<com.ecommerce.product.entity.Product> productOpt = productRepository.findById(item.getProductId());
                if (productOpt.isPresent()) {
                    com.ecommerce.product.entity.Product product = productOpt.get();
                    if (product.getStock() < item.getQuantity()) {
                        outOfStock.add(com.ecommerce.product.dto.response.StockCheckResponse.OutOfStockItem.builder()
                                .productId(item.getProductId())
                                .variantId(null)
                                .productName(product.getName())
                                .requested(item.getQuantity())
                                .available(product.getStock())
                                .build());
                    }
                    if (product.getCategory() != null) {
                        String categoryId = product.getCategory().getId();
                        double rate = commissionRateRepository.findById(categoryId)
                                .map(com.ecommerce.product.entity.CommissionRate::getRate).orElse(5.0);
                        commissionRates.put(item.getProductId(), rate);
                    }
                } else {
                    outOfStock.add(com.ecommerce.product.dto.response.StockCheckResponse.OutOfStockItem.builder()
                            .productId(item.getProductId())
                            .variantId(null)
                            .productName("Sản phẩm không còn tồn tại")
                            .requested(item.getQuantity())
                            .available(0)
                            .build());
                }
            }
        }

        return com.ecommerce.product.dto.response.StockCheckResponse.builder()
                .available(outOfStock.isEmpty())
                .outOfStockItems(outOfStock)
                .commissionRates(commissionRates)
                .build();
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "product", key = "#productId"),
            @CacheEvict(value = "products", allEntries = true)
    })
    public void decrementStock(String productId, String variantId, int quantity) {
        if (variantId != null && !variantId.isEmpty()) {
            int updated = productVariantRepository.decrementStockAtomic(variantId, quantity);
            if (updated == 0) {
                throw new RuntimeException("Không đủ tồn kho cho variant: " + variantId);
            }
            productRepository.incrementSoldCount(productId, quantity);
        } else {
            int updated = productRepository.decrementStockAtomic(productId, quantity);
            if (updated == 0) {
                throw new RuntimeException("Không đủ tồn kho cho sản phẩm: " + productId);
            }
        }
        log.info("Stock decremented: productId={}, variantId={}, qty={}", productId, variantId, quantity);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "product", key = "#productId"),
            @CacheEvict(value = "products", allEntries = true)
    })
    public void incrementStock(String productId, String variantId, int quantity) {
        if (variantId != null && !variantId.isEmpty()) {
            productVariantRepository.incrementStockAtomic(variantId, quantity);
        } else {
            productRepository.incrementStockAtomic(productId, quantity);
        }
        log.info("Stock incremented (rollback): productId={}, variantId={}, qty={}", productId, variantId, quantity);
    }


    @Override
    public List<com.ecommerce.product.dto.response.ReviewResponse> getReviewsByProductId(String productId) {
        return productReviewRepository.findByProductId(productId).stream().map(review -> {
            return com.ecommerce.product.dto.response.ReviewResponse.builder()
                    .id(review.getId())
                    .productId(review.getProduct().getId())
                    .customerName(review.getUserId())
                    .rating(review.getRating())
                    .reviewText(review.getReviewText())
                    .createdAt(review.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    public void syncAllProductsToElasticsearch() {
        log.info("Bắt đầu đồng bộ toàn bộ Sản phẩm từ DB lên Elasticsearch...");
        java.util.List<Product> allProducts = productRepository.findAll();
        java.util.List<com.ecommerce.product.document.ProductDocument> documents = new java.util.ArrayList<>();
        
        for (Product product : allProducts) {
            com.ecommerce.product.document.ProductDocument doc = com.ecommerce.product.document.ProductDocument.builder()
                    .id(product.getId())
                    .name(product.getName())
                    .description(product.getDescription())
                    .price(product.getPrice())
                    .sellerId(product.getSellerId())
                    .status(product.getStatus().name())
                    .ratingAvg(product.getRatingAvg())
                    .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                    .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                    .build();
            documents.add(doc);
        }
        
        productElasticsearchRepository.saveAll(documents);
        log.info("Hoàn tất đồng bộ {} sản phẩm lên Elasticsearch!", documents.size());
    }

}
