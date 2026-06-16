$services = Get-ChildItem -Path "d:\Ecommerce-project\ecommerce-backend" -Directory -Filter "*-service"
foreach ($service in $services) {
    $pomPath = Join-Path $service.FullName "pom.xml"
    if (Test-Path $pomPath) {
        $content = Get-Content $pomPath -Raw
        
        # Add versions if missing
        if ($content -notmatch "<artifactId>spring-boot-starter-actuator</artifactId>\s*<version>") {
            $content = $content -replace "<artifactId>spring-boot-starter-actuator</artifactId>", "<artifactId>spring-boot-starter-actuator</artifactId>`n            <version>3.1.5</version>"
        }
        if ($content -notmatch "<artifactId>micrometer-registry-prometheus</artifactId>\s*<version>") {
            $content = $content -replace "<artifactId>micrometer-registry-prometheus</artifactId>", "<artifactId>micrometer-registry-prometheus</artifactId>`n            <version>1.11.5</version>"
        }
        if ($content -notmatch "<artifactId>micrometer-tracing-bridge-brave</artifactId>\s*<version>") {
            $content = $content -replace "<artifactId>micrometer-tracing-bridge-brave</artifactId>", "<artifactId>micrometer-tracing-bridge-brave</artifactId>`n            <version>1.1.6</version>"
        }
        if ($content -notmatch "<artifactId>zipkin-reporter-brave</artifactId>\s*<version>") {
            $content = $content -replace "<artifactId>zipkin-reporter-brave</artifactId>", "<artifactId>zipkin-reporter-brave</artifactId>`n            <version>2.16.4</version>"
        }
        
        Set-Content -Path $pomPath -Value $content
        Write-Host "Fixed versions in $pomPath"
    }
}
