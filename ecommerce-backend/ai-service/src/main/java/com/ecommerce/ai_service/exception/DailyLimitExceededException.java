package com.ecommerce.ai_service.exception;

public class DailyLimitExceededException extends RuntimeException {
    public DailyLimitExceededException(int limit) {
        super("Bạn đã đạt giới hạn " + limit + " yêu cầu AI trong hôm nay. Vui lòng thử lại vào ngày mai.");
    }
}
