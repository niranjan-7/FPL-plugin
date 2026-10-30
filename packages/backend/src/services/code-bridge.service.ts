import type { FplPlayer, FplTeam } from '@fpl-companion/shared';

export interface UnifiedPlayerMapItem {
  code: number;
  classicId: number;
  draftId?: number;
  webName: string;
  fullName: string;
  teamId: number;
  teamCode: number;
  teamShortName: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
}

export class CodeBridgeService {
  private static instance: CodeBridgeService;

  private codeToClassicId = new Map<number, number>();
  private classicIdToCode = new Map<number, number>();
  private draftIdToCode = new Map<number, number>();
  private codeToDraftId = new Map<number, number>();
  private nameToCode = new Map<string, number>();
  private unifiedRegistry = new Map<number, UnifiedPlayerMapItem>();

  private teamIdToShortName = new Map<number, string>();
  private teamShortNameToId = new Map<string, number>();
  private teamCodeToId = new Map<number, number>();

  public static getInstance(): CodeBridgeService {
    if (!CodeBridgeService.instance) {
      CodeBridgeService.instance = new CodeBridgeService();
    }
    return CodeBridgeService.instance;
  }

  public registerTeams(teams: FplTeam[]): void {
    for (const team of teams) {
      this.teamIdToShortName.set(team.id, team.short_name);
      this.teamShortNameToId.set(team.short_name.toUpperCase(), team.id);
      this.teamShortNameToId.set(team.name.toUpperCase(), team.id);
      this.teamCodeToId.set(team.code, team.id);
    }
  }

  public registerClassicPlayers(players: FplPlayer[], teams: FplTeam[]): void {
    const teamMap = new Map<number, FplTeam>();
    for (const t of teams) {
      teamMap.set(t.id, t);
    }

    const positionMap: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
      1: 'GK',
      2: 'DEF',
      3: 'MID',
      4: 'FWD',
    };

    for (const player of players) {
      this.codeToClassicId.set(player.code, player.id);
      this.classicIdToCode.set(player.id, player.code);

      const team = teamMap.get(player.team);
      const teamShort = team ? team.short_name : 'UNK';
      const teamCode = team ? team.code : 0;
      const fullName = `${player.first_name} ${player.second_name}`.trim();

      // Normalize names for fuzzy search
      this.nameToCode.set(player.web_name.toLowerCase(), player.code);
      this.nameToCode.set(fullName.toLowerCase(), player.code);
      this.nameToCode.set(player.second_name.toLowerCase(), player.code);

      const existing = this.unifiedRegistry.get(player.code);
      this.unifiedRegistry.set(player.code, {
        code: player.code,
        classicId: player.id,
        draftId: existing?.draftId,
        webName: player.web_name,
        fullName,
        teamId: player.team,
        teamCode,
        teamShortName: teamShort,
        position: positionMap[player.element_type] || 'MID',
      });
    }
  }

  public registerDraftElements(draftElements: Array<{ id: number; code: number }>): void {
    for (const el of draftElements) {
      this.draftIdToCode.set(el.id, el.code);
      this.codeToDraftId.set(el.code, el.id);

      const item = this.unifiedRegistry.get(el.code);
      if (item) {
        item.draftId = el.id;
      }
    }
  }

  public getCodeFromClassicId(id: number): number | undefined {
    return this.classicIdToCode.get(id);
  }

  public getClassicIdFromCode(code: number): number | undefined {
    return this.codeToClassicId.get(code);
  }

  public getCodeFromDraftId(draftId: number): number | undefined {
    return this.draftIdToCode.get(draftId);
  }

  public getDraftIdFromCode(code: number): number | undefined {
    return this.codeToDraftId.get(code);
  }

  public resolvePlayerCodeByName(query: any): number | undefined {
    if (typeof query !== 'string') {
      if (query && typeof query === 'object' && query.name) {
        query = query.name;
      } else {
        query = String(query || '');
      }
    }
    const clean = query.trim().toLowerCase();
    if (!clean) return undefined;
    if (this.nameToCode.has(clean)) {
      return this.nameToCode.get(clean);
    }
    // Substring search
    for (const [name, code] of this.nameToCode.entries()) {
      if (name.includes(clean) || clean.includes(name)) {
        return code;
      }
    }
    return undefined;
  }

  public getPlayerByCode(code: number): UnifiedPlayerMapItem | undefined {
    return this.unifiedRegistry.get(code);
  }

  public getTeamShortName(teamId: number): string {
    return this.teamIdToShortName.get(teamId) || 'UNK';
  }

  public getTeamId(teamName: string): number | undefined {
    if (!teamName) return undefined;
    const direct = this.teamShortNameToId.get(teamName.trim().toUpperCase());
    if (direct !== undefined) return direct;
    const norm = this.normalizeTeamName(teamName).toUpperCase();
    return this.teamShortNameToId.get(norm);
  }

  public normalizeTeamName(name: string): string {
    const upper = name.trim().toUpperCase();
    if (upper === 'MCI' || upper.includes('MANCHESTER CITY') || upper.includes('MAN CITY')) return 'Man City';
    if (upper === 'LIV' || upper.includes('LIVERPOOL')) return 'Liverpool';
    if (upper === 'ARS' || upper.includes('ARSENAL')) return 'Arsenal';
    if (upper === 'CHE' || upper.includes('CHELSEA')) return 'Chelsea';
    if (upper === 'AVL' || upper.includes('ASTON VILLA')) return 'Aston Villa';
    if (upper === 'TOT' || upper.includes('TOTTENHAM') || upper === 'SPURS') return 'Spurs';
    if (upper === 'NEW' || upper.includes('NEWCASTLE')) return 'Newcastle';
    if (upper === 'MUN' || upper.includes('MANCHESTER UNITED') || upper.includes('MAN UTD')) return 'Man Utd';
    if (upper === 'BRE' || upper.includes('BRENTFORD')) return 'Brentford';
    if (upper === 'BHA' || upper.includes('BRIGHTON')) return 'Brighton';
    if (upper === 'BOU' || upper.includes('BOURNEMOUTH')) return 'Bournemouth';
    if (upper === 'FUL' || upper.includes('FULHAM')) return 'Fulham';
    if (upper === 'CRY' || upper.includes('CRYSTAL PALACE')) return 'Crystal Palace';
    if (upper === 'NFO' || upper.includes('NOTTINGHAM FOREST') || upper.includes("NOTT'M FOREST")) return "Nott'm Forest";
    if (upper === 'WHU' || upper.includes('WEST HAM')) return 'West Ham';
    if (upper === 'EVE' || upper.includes('EVERTON')) return 'Everton';
    if (upper === 'WOL' || upper.includes('WOLVES') || upper.includes('WOLVERHAMPTON')) return 'Wolves';
    if (upper === 'IPS' || upper.includes('IPSWICH')) return 'Ipswich';
    if (upper === 'LEI' || upper.includes('LEICESTER')) return 'Leicester';
    if (upper === 'SOU' || upper.includes('SOUTHAMPTON')) return 'Southampton';
    return name;
  }
}

export const codeBridge = CodeBridgeService.getInstance();
