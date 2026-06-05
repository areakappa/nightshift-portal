import { TeamContentDto } from './TeamContentDto';

export interface TeamDto {
    id: number;
    idorganization: number | null;
    name: string;
    description: string;
    state: number;
    teamContents: TeamContentDto[];
    created: string;
}
