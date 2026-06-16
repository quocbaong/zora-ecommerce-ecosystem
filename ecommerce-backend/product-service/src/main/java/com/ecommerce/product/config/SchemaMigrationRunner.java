package com.ecommerce.product.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // Hibernate ddl-auto=update không tự sửa CHECK constraint khi enum được mở rộng.
        // Tự đồng bộ constraint của ad_campaigns.status với enum AdCampaignStatus hiện tại.
        try {
            jdbcTemplate.execute("ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_status_check");
            jdbcTemplate.execute(
                    "ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_status_check " +
                    "CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'FORCE_STOPPED'))"
            );
            log.info("[SchemaMigration] ad_campaigns_status_check synced with AdCampaignStatus enum");
        } catch (Exception e) {
            log.warn("[SchemaMigration] Không sync được ad_campaigns_status_check: {}", e.getMessage());
        }
    }
}
