package com.khadyabachao.notification;

public interface NotificationDispatchService {
    void dispatchScheduleConfirmationSms(String recipientPhone, String recipientName, String agreedTime, String location);
}
