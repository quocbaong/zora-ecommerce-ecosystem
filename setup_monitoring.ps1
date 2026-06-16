$services = Get-ChildItem -Path "d:\Ecommerce-project\ecommerce-backend" -Directory -Filter "*-service"
$deps = @"

        <!-- Observability: Actuator, Prometheus, Zipkin -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-tracing-bridge-brave</artifactId>
        </dependency>
        <dependency>
            <groupId>io.zipkin.reporter2</groupId>
            <artifactId>zipkin-reporter-brave</artifactId>
        </dependency>
"@

$yamlConfig = @"

management:
  endpoints:
    web:
      exposure:
        include: prometheus, health, info
  endpoint:
    health:
      show-details: always
  tracing:
    sampling:
      probability: 1.0
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
"@

foreach ($service in $services) {
    # Update pom.xml
    $pomPath = Join-Path $service.FullName "pom.xml"
    if (Test-Path $pomPath) {
        $pomContent = Get-Content $pomPath -Raw
        if ($pomContent -notmatch "spring-boot-starter-actuator") {
            $pomContent = $pomContent -replace "</dependencies>", "$deps`n    </dependencies>"
            Set-Content -Path $pomPath -Value $pomContent
            Write-Host "Updated $pomPath"
        }
    }
    
    # Update application.yml
    $ymlPath = Join-Path $service.FullName "src\main\resources\application.yml"
    if (Test-Path $ymlPath) {
        $ymlContent = Get-Content $ymlPath -Raw
        if ($ymlContent -notmatch "management:\|management.endpoints") {
            Add-Content -Path $ymlPath -Value $yamlConfig
            Write-Host "Updated $ymlPath"
        }
    }
}
Write-Host "All files updated successfully!"
