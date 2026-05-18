import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { OrganizationMemberRawDto } from '../dto/organization-member-raw.dto';
import { OrganizationMemberRole } from '../enums/organization-member-role.enum';
import { Position } from '../../modules/organizations/entities/position.entity';

@Injectable()
export class OrganizationMembersService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
  ) {}

  async buildMembersResponse(
    queryBuilders: Array<SelectQueryBuilder<ObjectLiteral>>,
    offset: number,
    limit: number,
  ) {
    const { paginatedResults, positions, total } = await this.buildMembersBase(
      queryBuilders,
      offset,
      limit,
    );

    return {
      items: paginatedResults.map((result: OrganizationMemberRawDto) => ({
        id: result.id,
        full_name: result.full_name,
        email: result.email,
        phone: result.phone,
        photo: result.photo,
        role: result.role,
        ...(result.role === OrganizationMemberRole.EMPLOYEE && {
          positions:
            result.position_ids && result.position_ids[0] !== null
              ? positions.filter((p) =>
                  result.position_ids?.includes(p.position_id),
                )
              : [],
        }),
        created_at: result.created_at,
      })),
      total,
      offset,
      limit,
    };
  }

  async buildMembersResponseWithExtras<TExtra extends object>(
    queryBuilders: Array<SelectQueryBuilder<ObjectLiteral>>,
    offset: number,
    limit: number,
    mapExtra: (raw: OrganizationMemberRawDto & TExtra) => TExtra,
  ): Promise<
    Array<
      {
        id: number;
        full_name: string;
        email: string;
        phone: string | null;
        photo: string | null;
        role: OrganizationMemberRole;
        created_at: Date;
        positions?: Position[];
      } & TExtra
    >
  > {
    const { paginatedResults, positions } = await this.buildMembersBase(
      queryBuilders,
      offset,
      limit,
    );
    const typedResults = paginatedResults as Array<
      OrganizationMemberRawDto & TExtra
    >;

    return typedResults.map((result) => ({
      id: result.id,
      full_name: result.full_name,
      email: result.email,
      phone: result.phone,
      photo: result.photo,
      role: result.role,
      ...(result.role === OrganizationMemberRole.EMPLOYEE && {
        positions:
          result.position_ids && result.position_ids[0] !== null
            ? positions.filter((p) =>
                result.position_ids?.includes(p.position_id),
              )
            : [],
      }),
      created_at: result.created_at,
      ...mapExtra(result),
    }));
  }

  private async buildMembersBase<T extends OrganizationMemberRawDto>(
    queryBuilders: Array<SelectQueryBuilder<ObjectLiteral>>,
    offset: number,
    limit: number,
  ): Promise<{ paginatedResults: T[]; positions: Position[]; total: number }> {
    const resultsPromises: Array<Promise<T[]>> = queryBuilders.map((query) =>
      query.getRawMany<T>(),
    );
    const results = await Promise.all(resultsPromises);

    const allResults: T[] = results.flat();

    allResults.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    const paginatedResults = allResults.slice(offset, offset + limit);
    const total = allResults.length;

    const positionIds = paginatedResults
      .flatMap((r) => r.position_ids || [])
      .filter((id): id is number => id !== null);

    const positions =
      positionIds.length > 0
        ? await this.positionRepository.find({
            where: positionIds.map((id) => ({ position_id: id })),
            select: ['position_id', 'role', 'description', 'created_at'],
          })
        : [];

    return { paginatedResults, positions, total };
  }
}
