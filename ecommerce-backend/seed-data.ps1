# seed-data.ps1
Write-Host "Đang nạp dữ liệu mẫu vào Docker..." -ForegroundColor Cyan

# Nạp dữ liệu cho Auth/User Service (Database: ecommerce)
Get-Content seed_ecommerce.sql | docker exec -i ecommerce-postgres psql -U postgres -d ecommerce

# Nạp dữ liệu cho Product Service (Database: product_db)
Get-Content seed_product_db.sql | docker exec -i ecommerce-postgres psql -U postgres -d product_db

# Nạp dữ liệu cho Order Service (Database: order_db)
Get-Content seed_order_db.sql | docker exec -i ecommerce-postgres psql -U postgres -d order_db

Write-Host "Xong! Dữ liệu mẫu đã được nạp thành công." -ForegroundColor Green
