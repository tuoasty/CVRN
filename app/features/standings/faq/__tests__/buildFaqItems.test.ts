import {describe, expect, it} from "vitest";
import {buildFaqItems} from "../buildFaqItems";

const base = {qualifiedTeams: null, playinTeams: 0, hasCarryInPoints: false};
const answer = (items: ReturnType<typeof buildFaqItems>, question: string) => items.find(i => i.question === question)?.answer;

describe("buildFaqItems", () => {
    it("explains LVR ranking and the formula", () => {
        const items = buildFaqItems({...base, method: "lvr"});
        expect(answer(items, "How is the table ranked?")).toBe("By LVR (Lego Volleyball Rating), highest first.");
        expect(answer(items, "How does LVR change?")).toBe(
            "Every team starts the season at a base LVR, usually 100. Each season match moves it by up to 10 either way: 70% from the set difference and 30% from the rally point difference. Change = 10 × (0.7 × set difference ÷ 2 + 0.3 × point difference ÷ 50). The loser loses what the winner gains.",
        );
        expect(answer(items, "How do forfeits count?")).toBe("Recorded as a straight-sets result, so they count in W, L and sets. The forfeiting team loses 10 LVR and the opponent gains 5.");
    });

    it("explains points with bonus tiers", () => {
        const items = buildFaqItems({...base, method: "points"});
        expect(answer(items, "How is the table ranked?")).toBe("By wins. Teams level on wins are separated by points, then sets won, then fewest losses.");
        expect(answer(items, "How are points earned?")).toBe(
            "A win is worth 2, plus 0.5 for every set won; a loss earns 0.5 per set won. The winner also gets a bonus by rally point margin: 5+ is 0.5, 10+ is 1, 15+ is 2, 20+ is 3, 25+ is 4, 30+ is 5. Pts includes the bonus.",
        );
        expect(answer(items, "How do forfeits count?")).toBe("Recorded as a straight-sets result, so they count in W, L and sets. The winner gets 3 points and a 1 point bonus.");
    });

    it("mentions carried-over points only when a team has them", () => {
        const withCarry = answer(buildFaqItems({...base, method: "points", hasCarryInPoints: true}), "How are points earned?");
        expect(withCarry).toMatch(/ Some teams start the season with points carried over\.$/);
        expect(answer(buildFaqItems({...base, method: "points"}), "How are points earned?")).not.toMatch(/carried over/);
    });

    it("explains points without bonus", () => {
        const items = buildFaqItems({...base, method: "points_without_bonus"});
        expect(answer(items, "How is the table ranked?")).toBe("By points. Teams level on points are separated by rally point difference in the most recent round.");
        expect(answer(items, "How are points earned?")).toBe("A 2-0 win is worth 2, a 2-1 win 1.5, a 1-2 loss 0.5, a 0-2 loss 0.");
        expect(answer(items, "How do forfeits count?")).toBe("Recorded as a straight-sets result, so they count in W, L and sets. The winner gets 1 point.");
    });

    it("explains the zone lines only when zones exist", () => {
        expect(answer(buildFaqItems({...base, method: "lvr"}), "What do the lines mean?")).toBeUndefined();
        expect(answer(buildFaqItems({...base, method: "lvr", qualifiedTeams: 12}), "What do the lines mean?")).toBe("The top 12 teams go to the playoffs. The number of spots may change.");
        expect(answer(buildFaqItems({...base, method: "lvr", qualifiedTeams: 8, playinTeams: 4}), "What do the lines mean?")).toBe("The top 8 teams go to the playoffs, the next 4 to the play-in. The number of spots may change.");
    });
});
