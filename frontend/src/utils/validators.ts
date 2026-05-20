import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const registerClientSchema = loginSchema.extend({
  name: z.string().min(2, 'Nombre obligatorio'),
  phone: z.string().optional()
});

export const registerOwnerSchema = registerClientSchema.extend({
  businessName: z.string().min(2, 'Nombre del negocio obligatorio')
});

export const reservationSchema = z.object({
  vehicleType: z.enum(['car', 'truck', 'bike']),
  plateNumber: z.string().min(3, 'Patente requerida'),
  startDate: z.string(),
  endDate: z.string()
});
