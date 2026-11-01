import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Marca que el vehículo único previo (client_profiles.default_vehicle_*) ya se
 * copió a client_vehicles, para no volver a crearlo si el cliente lo elimina.
 */
@Entity('client_vehicle_backfills')
export class ClientVehicleBackfill {
  @PrimaryColumn({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
