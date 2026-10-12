import {describe, it, expect} from "vitest";
import {groupBySpecPosition} from "../specGroups";

type Item = {id: string; spec: {name: string; position: string; stars: number}};

const item = (id: string, position: string, stars: number, name = id): Item => ({id, spec: {name, position, stars}});

describe("groupBySpecPosition", () => {
    it("groups DB position codes in court order with full labels", () => {
        const groups = groupBySpecPosition([item("a", "L", 3), item("b", "OH", 4), item("c", "S", 5), item("d", "MB", 2), item("e", "OP", 1)], i => i.spec);
        expect(groups.map(g => g.label)).toEqual(["Outside Hitter", "Opposite", "Middle Blocker", "Setter", "Libero"]);
    });

    it("sorts inside a group by the spec's max stars, then name", () => {
        const [group] = groupBySpecPosition([item("a", "OH", 3, "Zed"), item("b", "OH", 5, "Ace"), item("c", "OH", 3, "Alpha")], i => i.spec);
        expect(group.items.map(i => i.id)).toEqual(["b", "c", "a"]);
    });

    it("puts unknown positions last under their raw label", () => {
        const groups = groupBySpecPosition([item("a", "XX", 3), item("b", "S", 4)], i => i.spec);
        expect(groups.map(g => g.label)).toEqual(["Setter", "XX"]);
    });

    it("returns no groups for no items", () => {
        expect(groupBySpecPosition([], (i: Item) => i.spec)).toEqual([]);
    });
});
