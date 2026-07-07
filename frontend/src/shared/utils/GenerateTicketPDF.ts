import { jsPDF } from "jspdf";
import type { TicketData } from "../../types/ticket.types";

export const generateTicketPDF = (ticket: TicketData) => {

  const doc = new jsPDF();

  doc.setFontSize(22);

  doc.text("ESTACIONAPP", 105, 20, {
    align: "center",
  });

  doc.setFontSize(18);

  doc.text("TICKET DE SALIDA", 105, 40, {
    align: "center",
  });

  doc.setFontSize(12);

  doc.text(
    `N° ${ticket.ticketNumber}`,
    105,
    50,
    {
      align: "center",
    }
  );

  let y = 70;

  doc.text(
    `Estacionamiento: ${ticket.parkingLot.name}`,
    20,
    y
  );

  y += 10;

  doc.text(
    `Dirección: ${ticket.parkingLot.address}`,
    20,
    y
  );

  y += 15;

  doc.text(
    `Patente: ${ticket.vehiclePlate}`,
    20,
    y
  );

  y += 10;

  doc.text(
    `Entrada: ${ticket.checkInTime}`,
    20,
    y
  );

  y += 10;

  doc.text(
    `Salida: ${ticket.checkOutTime}`,
    20,
    y
  );

  y += 10;

  doc.text(
    `Duración: ${ticket.duration}`,
    20,
    y
  );

  y += 10;

  if (ticket.pricePerHour) {

    doc.text(
      `Tarifa: $${ticket.pricePerHour}/hora`,
      20,
      y
    );

    y += 15;
  }

  doc.setFontSize(18);

  doc.text(
    `TOTAL: $${ticket.totalAmount}`,
    20,
    y
  );

  if (ticket.isAnonymous) {

    y += 20;

    doc.setFontSize(10);

    doc.text(
      "Salida realizada mediante QR",
      20,
      y
    );
  }

  doc.save(
    `ticket-${ticket.vehiclePlate}.pdf`
  );

};