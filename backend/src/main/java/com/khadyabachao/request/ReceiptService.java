package com.khadyabachao.request;

import com.khadyabachao.chat.PickupSchedule;
import com.khadyabachao.chat.PickupScheduleRepository;
import com.khadyabachao.listing.FoodListing;
import com.khadyabachao.listing.ListingStatus;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceiptService {

    private final FoodRequestRepository requestRepository;
    private final PickupScheduleRepository scheduleRepository;

    // Receipts are printed by Bangladeshi users — render in Asia/Dhaka rather
    // than the container's system TZ (typically UTC in deployment), which put
    // handover times 6 hours off from what the app displayed.
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z")
            .withZone(ZoneId.of("Asia/Dhaka"));

    @Transactional(readOnly = true)
    public byte[] generateReceiptPdf(UUID requestId, UUID userId) {
        FoodRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));

        // Only participants (donor or recipient) can download receipt
        UUID donorId = request.getListing().getDonor().getId();
        UUID recipientId = request.getRecipient().getId();
        if (!userId.equals(donorId) && !userId.equals(recipientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to access this receipt");
        }

        FoodListing listing = request.getListing();
        if (listing.getStatus() != ListingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt can only be generated for completed pickups");
        }

        Optional<PickupSchedule> scheduleOpt = scheduleRepository.findByRequestId(requestId);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            // Header Font
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, Color.DARK_GRAY);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.BLACK);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.BLACK);
            Font mutedFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);

            // App Title
            Paragraph title = new Paragraph("Khadya Bachao - Food Rescue Receipt", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15);
            document.add(title);

            Paragraph subtitle = new Paragraph("Official Handover & Completion Certificate", headerFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            // Table of Details
            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);
            table.setSpacingAfter(20f);
            table.setWidths(new float[]{35f, 65f});

            addTableRow(table, "Receipt ID:", request.getId().toString(), headerFont, bodyFont);
            addTableRow(table, "Food Item Title:", listing.getTitle(), headerFont, bodyFont);
            addTableRow(table, "Food Type:", listing.getFoodType().name(), headerFont, bodyFont);
            addTableRow(table, "Quantity:", listing.getQuantityValue() + " " + listing.getQuantityUnit(), headerFont, bodyFont);
            addTableRow(table, "Donor Name:", listing.getDonor().getName(), headerFont, bodyFont);
            addTableRow(table, "Recipient Name:", request.getRecipient().getName(), headerFont, bodyFont);

            String agreedLocation = scheduleOpt.map(PickupSchedule::getAgreedLocation)
                    .orElse(listing.getPickupAddress() != null ? listing.getPickupAddress() : "Coordinates: " + listing.getPickupLat() + ", " + listing.getPickupLng());
            addTableRow(table, "Pickup Location:", agreedLocation, headerFont, bodyFont);

            String agreedTime = scheduleOpt.map(s -> s.getAgreedTime() != null ? FORMATTER.format(s.getAgreedTime()) : null)
                    .orElse(FORMATTER.format(listing.getPickupDeadline()));
            addTableRow(table, "Agreed Pickup Time:", agreedTime, headerFont, bodyFont);

            String completionTime = listing.getCompletedAt() != null ? FORMATTER.format(listing.getCompletedAt()) : FORMATTER.format(java.time.Instant.now());
            addTableRow(table, "Completion Timestamp:", completionTime, headerFont, bodyFont);

            document.add(table);

            // Footer
            Paragraph footer = new Paragraph("Thank you for reducing food waste with Khadya Bachao! 🌾", mutedFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate PDF receipt", e);
        }
    }

    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setPadding(8);
        labelCell.setBackgroundColor(new Color(245, 247, 250));

        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "N/A", valueFont));
        valueCell.setPadding(8);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}
