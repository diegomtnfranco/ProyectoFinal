import { jsPDF } from "jspdf";
import type { TicketData } from "../../types/ticket.types";
import logo from "../../assets/logos/logo-eapp4.png";

export const generateTicketPDF = (ticket: TicketData) => {

  // Desglose opcional (horas, noches, servicios) calculado por el backend
  const breakdownLines = buildBreakdownLines(ticket);

  // Papel térmico de 80 mm (se alarga si hay desglose)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 180 + Math.max(0, breakdownLines.length - 1) * 6],
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
    "PNG",
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

  if (breakdownLines.length) {
    doc.setFontSize(9);
    for (const [label, value] of breakdownLines) {
      doc.text(label, 10, y, { maxWidth: 46 });
      doc.text(value, 70, y, { align: "right" });
      y += 6;
    }
    doc.setFontSize(10);
    y -= 6;
  } else {
    doc.text(`Tarifa: $${ticket.pricePerHour}/hora`, 10, y);
  }

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

const money = (n: number) => `$${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

function buildBreakdownLines(ticket: TicketData): [string, string][] {
  const b = ticket.breakdown;
  if (!b) return [];
  const lines: [string, string][] = [];
  if (b.parkingSource === 'reservation') {
    lines.push(['Reserva', money(b.parkingAmount)]);
  } else {
    if (b.hourlyHours > 0 || b.nights === 0) lines.push([`${b.hourlyHours} h x ${money(b.pricePerHour)}`, money(b.hourlyAmount)]);
    if (b.nights > 0) lines.push([`${b.nights} noche(s) x ${money(b.nightAmountPerNight ?? 0)}`, money(b.nightAmount)]);
  }
  for (const sv of b.services) {
    const label = sv.unitPrice != null && sv.quantity > 1 ? `${sv.name} (${sv.quantity} x ${money(sv.unitPrice)})` : sv.name;
    lines.push([
      label,
      sv.status === 'not_performed' ? 'No realizado' : sv.subtotal > 0 ? money(sv.subtotal) : sv.pricingType === 'included' ? 'Incluido' : 'Gratis',
    ]);
  }
  return lines;
}
