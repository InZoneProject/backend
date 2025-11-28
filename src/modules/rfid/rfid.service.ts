import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RfidReader } from './entities/rfid-reader.entity';
import { RfidTag } from './entities/rfid-tag.entity';
import { OrganizationIdDto } from '../../shared/dto/organization-id.dto';
import { OrganizationOwnershipValidator } from '../../shared/validators/organization-ownership.validator';
import { TokenHashService } from '../../shared/services/token-hash.service';
import { RFID_CONSTANTS } from './rfid.constants';

@Injectable()
export class RfidService {
  constructor(
    @InjectRepository(RfidReader)
    private readonly rfidReaderRepository: Repository<RfidReader>,
    @InjectRepository(RfidTag)
    private readonly rfidTagRepository: Repository<RfidTag>,
    private readonly organizationOwnershipValidator: OrganizationOwnershipValidator,
    private readonly tokenHashService: TokenHashService,
  ) {}

  async createRfidReader(
    userId: number,
    createRfidReaderDto: OrganizationIdDto,
  ): Promise<{ rfid_reader: RfidReader; plain_token: string }> {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      createRfidReaderDto.organization_id,
    );

    const plain_token = this.tokenHashService.generateToken();
    const hashed_token = this.tokenHashService.hashToken(plain_token);

    const rfidReader = this.rfidReaderRepository.create({
      secret_token: hashed_token,
      organization: { organization_id: createRfidReaderDto.organization_id },
    });

    const savedReader = await this.rfidReaderRepository.save(rfidReader);

    return { rfid_reader: savedReader, plain_token };
  }

  async createRfidTag(
    userId: number,
    createRfidTagDto: OrganizationIdDto,
  ): Promise<RfidTag> {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      createRfidTagDto.organization_id,
    );

    const rfidTag = this.rfidTagRepository.create({
      organization: { organization_id: createRfidTagDto.organization_id },
    });

    return this.rfidTagRepository.save(rfidTag);
  }

  async deleteRfidReader(userId: number, readerId: number): Promise<void> {
    const reader = await this.rfidReaderRepository.findOne({
      where: { rfid_reader_id: readerId },
      relations: ['organization'],
    });

    if (!reader) {
      throw new NotFoundException(
        RFID_CONSTANTS.ERROR_MESSAGES.RFID_READER_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      reader.organization.organization_id,
    );

    await this.rfidReaderRepository.delete(readerId);
  }

  async deleteRfidTag(userId: number, tagId: number): Promise<void> {
    const tag = await this.rfidTagRepository.findOne({
      where: { rfid_tag_id: tagId },
      relations: ['organization'],
    });

    if (!tag) {
      throw new NotFoundException(
        RFID_CONSTANTS.ERROR_MESSAGES.RFID_TAG_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      tag.organization.organization_id,
    );

    await this.rfidTagRepository.delete(tagId);
  }
}
