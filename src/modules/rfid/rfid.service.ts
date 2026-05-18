import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RfidReader } from './entities/rfid-reader.entity';
import { RfidTag } from './entities/rfid-tag.entity';
import { Door } from '../buildings/entities/door.entity';
import { OrganizationOwnershipValidator } from '../../shared/validators/organization-ownership.validator';
import { TokenHashService } from '../../shared/services/token-hash.service';
import { RFID_CONSTANTS } from './rfid.constants';
import { CreateRfidTagDto } from './dto/create-rfid-tag.dto';
import { CreateRfidReaderDto } from './dto/create-rfid-reader.dto';
import { UpdateRfidTagDto } from './dto/update-rfid-tag.dto';
import { UpdateRfidReaderDto } from './dto/update-rfid-reader.dto';

@Injectable()
export class RfidService {
  constructor(
    @InjectRepository(RfidReader)
    private readonly rfidReaderRepository: Repository<RfidReader>,
    @InjectRepository(RfidTag)
    private readonly rfidTagRepository: Repository<RfidTag>,
    @InjectRepository(Door)
    private readonly doorRepository: Repository<Door>,
    private readonly organizationOwnershipValidator: OrganizationOwnershipValidator,
    private readonly tokenHashService: TokenHashService,
  ) {}

  async createRfidReader(
    userId: number,
    createRfidReaderDto: CreateRfidReaderDto,
  ): Promise<{ rfid_reader: RfidReader; plain_token: string }> {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      createRfidReaderDto.organization_id,
    );

    const plain_token = this.tokenHashService.generateToken();
    const hashed_token = this.tokenHashService.hashToken(plain_token);

    const rfidReader = this.rfidReaderRepository.create({
      secret_token: hashed_token,
      name: createRfidReaderDto.name,
      organization: { organization_id: createRfidReaderDto.organization_id },
    });

    const savedReader = await this.rfidReaderRepository.save(rfidReader);

    return { rfid_reader: savedReader, plain_token };
  }

  async createRfidReaderForDoor(
    userId: number,
    doorId: number,
    name: string,
  ): Promise<{ rfid_reader: RfidReader; plain_token: string }> {
    const door = await this.doorRepository.findOne({
      where: { door_id: doorId },
      relations: [
        'zone_to',
        'zone_to.building',
        'zone_to.building.organization',
      ],
    });

    if (!door) {
      throw new NotFoundException('Door not found');
    }

    const organizationId = door.zone_to.building.organization.organization_id;
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      organizationId,
    );

    return this.createRfidReader(userId, {
      organization_id: organizationId,
      name,
    });
  }

  async createRfidTag(
    userId: number,
    createRfidTagDto: CreateRfidTagDto,
  ): Promise<RfidTag> {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      createRfidTagDto.organization_id,
    );

    const rfidTag = this.rfidTagRepository.create({
      organization: { organization_id: createRfidTagDto.organization_id },
      tag_uid: createRfidTagDto.tag_uid,
      name: createRfidTagDto.name,
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

  async updateRfidTag(
    userId: number,
    tagId: number,
    updateRfidTagDto: UpdateRfidTagDto,
  ): Promise<RfidTag> {
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

    tag.name = updateRfidTagDto.name;

    return this.rfidTagRepository.save(tag);
  }

  async updateRfidReader(
    userId: number,
    readerId: number,
    updateRfidReaderDto: UpdateRfidReaderDto,
  ): Promise<RfidReader> {
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

    reader.name = updateRfidReaderDto.name;
    return this.rfidReaderRepository.save(reader);
  }

  async getDoorReader(
    userId: number,
    doorId: number,
  ): Promise<RfidReader | null> {
    const door = await this.doorRepository.findOne({
      where: { door_id: doorId },
      relations: [
        'zone_to',
        'zone_to.building',
        'zone_to.building.organization',
        'rfid_reader',
      ],
    });

    if (!door) {
      throw new NotFoundException('Door not found');
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      door.zone_to.building.organization.organization_id,
    );

    return door.rfid_reader;
  }

  async getAvailableReadersForDoor(
    userId: number,
    doorId: number,
    offset: number,
    limit: number,
    search?: string,
  ) {
    const door = await this.doorRepository.findOne({
      where: { door_id: doorId },
      relations: [
        'zone_to',
        'zone_to.building',
        'zone_to.building.organization',
      ],
    });

    if (!door) {
      throw new NotFoundException('Door not found');
    }

    const organizationId = door.zone_to.building.organization.organization_id;
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      organizationId,
    );

    const assignedReaderIds = (
      await this.doorRepository.find({
        where: {
          zone_to: {
            building: { organization: { organization_id: organizationId } },
          },
        },
        relations: [
          'rfid_reader',
          'zone_to',
          'zone_to.building',
          'zone_to.building.organization',
        ],
      })
    )
      .map((item) => item.rfid_reader?.rfid_reader_id)
      .filter((id): id is number => id !== undefined);

    const query = this.rfidReaderRepository
      .createQueryBuilder('reader')
      .where('reader.organization_id = :organizationId', { organizationId });

    if (assignedReaderIds.length > 0) {
      query.andWhere('reader.rfid_reader_id NOT IN (:...assignedReaderIds)', {
        assignedReaderIds,
      });
    }

    if (search) {
      query.andWhere('reader.name ILIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await query
      .orderBy('reader.created_at', 'DESC')
      .offset(offset)
      .limit(limit)
      .getManyAndCount();

    return { items, total, offset, limit };
  }

  async regenerateReaderToken(
    userId: number,
    readerId: number,
  ): Promise<{ rfid_reader: RfidReader; plain_token: string }> {
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

    const plain_token = this.tokenHashService.generateToken();

    reader.secret_token = this.tokenHashService.hashToken(plain_token);

    const savedReader = await this.rfidReaderRepository.save(reader);

    return { rfid_reader: savedReader, plain_token };
  }
}
