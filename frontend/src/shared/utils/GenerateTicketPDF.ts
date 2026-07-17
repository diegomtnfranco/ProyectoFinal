import { jsPDF } from "jspdf";
import type { TicketData } from "../../types/ticket.types";
import logo from "../../assets/logos/logo-eapp4.webp";

export const generateTicketPDF = (ticket: TicketData) => {

  // Papel térmico de 80 mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 180],
  });

  let y = 10;

  //----------------------------------------
  // ENCABEZADO
  //----------------------------------------

  const pageWidth = 80;

  const logoSize = 12;
  const text = "ESTACIONAPP";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);

  // ancho del texto
  const textWidth = doc.getTextWidth(text);

  // ancho total del bloque logo + separación + texto
  const totalWidth = logoSize + 3 + textWidth;

  // posición inicial para centrar el conjunto
  const startX = (pageWidth - totalWidth) / 2;

  // Logo
  doc.addImage(
    logo,      // <-- tu logo en Base64
    "WEBP",
    startX,
    y,
    logoSize,
    logoSize
  );

  // Texto
  doc.text(
    text,
    startX + logoSize + 3,
    y + 8
  );

  y += 18;

  //----------------------------------------
  // Línea
  //----------------------------------------

  doc.line(8, y, 72, y);

  y += 8;

  //----------------------------------------
  // Ticket
  //----------------------------------------

  doc.setFontSize(13);

  doc.text(
    `TICKET N° ${ticket.ticketNumber}`,
    40,
    y,
    {
      align: "center",
    }
  );

  y += 8;

  doc.setFontSize(9);

  doc.text(
    ticket.parkingLot.name,
    40,
    y,
    {
      align: "center",
    }
  );

  y += 5;

  doc.text(
    ticket.parkingLot.address,
    40,
    y,
    {
      align: "center",
    }
  );

  y += 8;

  doc.line(8, y, 72, y);

  y += 8;

  //----------------------------------------
  // Datos
  //----------------------------------------

  doc.setFontSize(10);

  doc.text(`Matrícula: ${ticket.vehiclePlate}`, 10, y);
  y += 8;

  doc.text(`Entrada: ${ticket.checkInTime}`, 10, y);
  y += 8;

  doc.text(`Salida: ${ticket.checkOutTime}`, 10, y);
  y += 8;

  doc.text(`Duración: ${ticket.duration}`, 10, y);
  y += 8;

  doc.text(`Tarifa: $${ticket.pricePerHour}/hora`, 10, y);

  y += 10;

  //----------------------------------------
  // Línea
  //----------------------------------------

  doc.line(8, y, 72, y);

  y += 12;

  //----------------------------------------
  // Total
  //----------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);

  doc.text("TOTAL", 10, y);

  doc.text(
    `$${ticket.totalAmount}`,
    70,
    y,
    {
      align: "right",
    }
  );

  y += 10;

  //----------------------------------------
  // Línea
  //----------------------------------------

  doc.line(8, y, 72, y);

  y += 12;

  //----------------------------------------
  // Gracias
  //----------------------------------------

  doc.setFontSize(12);

  doc.text(
    "¡GRACIAS!",
    40,
    y,
    {
      align: "center",
    }
  );

  doc.save(`ticket-${ticket.vehiclePlate}.pdf`);
};