package com.ecommerce.product.repository;

import com.ecommerce.product.document.ProductDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductElasticsearchRepository extends ElasticsearchRepository<ProductDocument, String> {

    @Query("{\"bool\": {\"must\": [{\"match\": {\"name\": {\"query\": \"?0\", \"fuzziness\": \"AUTO\"}}}], \"filter\": [{\"term\": {\"status\": \"ACTIVE\"}}]}}")
    Page<ProductDocument> searchByNameFuzzyAndActive(String name, Pageable pageable);
}
