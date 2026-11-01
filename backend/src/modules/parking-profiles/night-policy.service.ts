import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ParkingLotNightPolicy } from './entities/parking-lot-night-policy.entity';
import { NightPolicyView, UpdateNightPolicyDto } from './dto/night-policy.dto';
import {
  NIGHT_TOLERANCE_MINUTES,
  NightRateMode,
  PRICE_MAX,
} from './parking-profiles.constants';
import {
  AccessRequester,
  ParkingLotAccessService,
} from './parking-lot-access.service';

@Injectable()
export class NightPolicyService {
  constructor(
    @InjectRepository(ParkingLotNightPolicy)
    private readonly policyRepository: Repository<ParkingLotNightPolicy>,
    private readonly access: ParkingLotAccessService,
  ) {}

  async get(
    parkingLotId: string,
    user: AccessRequester,
  ): Promise<NightPolicyView> {
    const lot = await this.access.assertOwner(parkingLotId, user);
    const policy = await this.policyRepository.findOne({
      where: { parkingLotId },
    });
    return this.toView(lot, policy);
  }

  async update(
    parkingLotId: string,
    dto: UpdateNightPolicyDto,
    user: AccessRequester,
  ): Promise<NightPolicyView> {
    const lot = await this.access.assertOwner(parkingLotId, user);
    if (!Object.values(NightRateMode).includes(dto?.mode)) {
      throw new BadRequestException('Modalidad de tarifa nocturna inválida');
    }
    const existing = await this.policyRepository.findOne({
      where: { parkingLotId },
    });
    let nightAmount = existing?.nightAmount ?? null;

    if (dto.nightAmount !== undefined && dto.nightAmount !== null) {
      const amount = Number(dto.nightAmount);
      if (!Number.isFinite(amount) || amount <= 0)
        throw new BadRequestException('El importe nocturno debe ser mayor a 0');
      if (amount > PRICE_MAX)
        throw new BadRequestException('El importe nocturno es demasiado alto');
      if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
        throw new BadRequestException(
          'El importe nocturno admite como máximo 2 decimales',
        );
      }
      nightAmount = Math.round(amount * 100) / 100;
    }
    if (
      dto.mode === NightRateMode.SPECIAL &&
      (nightAmount === null || nightAmount <= 0)
    ) {
      throw new BadRequestException(
        'Para la tarifa nocturna especial indicá un importe mayor a 0',
      );
    }
    if (dto.mode === NightRateMode.SPECIAL && this.isOpen24h(lot)) {
      throw new BadRequestException(
        'El estacionamiento figura abierto las 24 h (apertura = cierre): no hay período nocturno',
      );
    }

    const saved = await this.policyRepository.save({
      parkingLotId: lot.id,
      mode: dto.mode,
      nightAmount,
      updatedBy: user.id,
    });
    return this.toView(lot, saved);
  }

  private isOpen24h(lot: ParkingLot): boolean {
    return (
      (lot.openTime ?? '').slice(0, 5) === (lot.closeTime ?? '').slice(0, 5)
    );
  }

  private toView(
    lot: ParkingLot,
    policy: ParkingLotNightPolicy | null,
  ): NightPolicyView {
    return {
      parkingLotId: lot.id,
      mode: policy?.mode ?? NightRateMode.HOURLY,
      nightAmount:
        policy?.nightAmount != null ? Number(policy.nightAmount) : null,
      toleranceMinutes: NIGHT_TOLERANCE_MINUTES,
      openTime: (lot.openTime ?? '').slice(0, 5),
      closeTime: (lot.closeTime ?? '').slice(0, 5),
      isOpen24h: this.isOpen24h(lot),
      updatedAt: policy?.updatedAt ?? null,
    };
  }
}
