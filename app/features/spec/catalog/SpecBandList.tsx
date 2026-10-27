'use client';

import {LeagueSpecWithAllRegions} from '@/server/domains/spec/types';
import {ListBandLabel, ListItem} from './SpecCatalogList';
import {RegionState, StarBand, specListMarker} from './catalogState';

interface Props {
    bands: StarBand<LeagueSpecWithAllRegions>[];
    vaulted: LeagueSpecWithAllRegions[];
    state: RegionState;
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export default function SpecBandList({bands, vaulted, state, selectedId, onSelect}: Props) {
    return (
        <>
            {bands.map(band => (
                <div key={band.stars}>
                    <ListBandLabel>{band.stars}★</ListBandLabel>
                    {band.items.map(spec => {
                        const marker = specListMarker(state[spec.id]);
                        return (
                            <ListItem
                                key={spec.id}
                                active={spec.id === selectedId}
                                quiet={marker.kind === 'none'}
                                onClick={() => onSelect(spec.id)}
                                label={spec.name}
                                trailing={
                                    marker.kind === 'none' ? (
                                        'none'
                                    ) : marker.kind === 'unset' ? (
                                        <>◌ {marker.count} unset</>
                                    ) : (
                                        <span className="font-mono tabular-nums">{marker.count}</span>
                                    )
                                }
                            />
                        );
                    })}
                </div>
            ))}
            {vaulted.length > 0 && (
                <div>
                    <ListBandLabel>Vaulted</ListBandLabel>
                    {vaulted.map(spec => (
                        <ListItem
                            key={spec.id}
                            active={spec.id === selectedId}
                            quiet
                            onClick={() => onSelect(spec.id)}
                            label={
                                <>
                                    {spec.name}
                                    <span className="ml-2 font-mono text-xs tabular-nums">{spec.stars}★</span>
                                </>
                            }
                            trailing={null}
                        />
                    ))}
                </div>
            )}
        </>
    );
}
