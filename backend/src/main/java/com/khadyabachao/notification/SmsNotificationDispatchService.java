package com.khadyabachao.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmsNotificationDispatchService implements NotificationDispatchService {

    @Value("${app.sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${app.sms.provider:twilio}")
    private String smsProvider;

    @Override
    public void dispatchScheduleConfirmationSms(String recipientPhone, String recipientName, String agreedTime, String location) {
        String messageTemplate = String.format(
            "KhadyaBachao Reminder: Hi %s, your food pickup is confirmed for %s at %s. Thank you for rescuing surplus food!",
            recipientName != null ? recipientName : "Partner",
            agreedTime != null ? agreedTime : "the agreed time",
            location != null ? location : "the agreed location"
        );

        if (!smsEnabled) {
            // Audit B33: mask the phone number — logs are not a PII store.
            log.info("SMS DISPATCH (STUB/DISABLED) -> phone={} | provider={} | message=\"{}\"",
                maskPhone(recipientPhone), smsProvider, messageTemplate);
            return;
        }

        // Active provider trigger hook (e.g. Twilio / Banglalink / Grameenphone SMS API Gateway)
        log.info("SMS DISPATCH (ACTIVE) -> Sending via {} to {} | message=\"{}\"",
            smsProvider, maskPhone(recipientPhone), messageTemplate);
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 5) {
            return "***";
        }
        return phone.substring(0, 3) + "…" + phone.substring(phone.length() - 2);
    }
}
