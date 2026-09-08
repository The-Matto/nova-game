import {useState} from "react";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";

//Shown on the victory screen for a real playthrough (not PIE-testing your own level - see
//LevelCompleteOverlay). Submits on click, no separate confirm step - a rating is low-stakes and
//freely re-clickable (upserted server-side, not accumulated), so there's nothing to lose by
//committing immediately.
export const LevelRatingWidget = ({levelId} : {levelId : string}) => {
    const [selected, setSelected] = useState<number | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);

    const rate = (rating : number) => {
        setSelected(rating);
        EnsureRegistered()
            .then(playerId => fetch('/api/levels/rating', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({levelId, playerId, rating}),
            }))
            .catch(() => {/* Leave the star selection as-is even if the request failed - not
                             worth a retry/error state for a low-stakes rating. */});
    };

    const displayValue = hovered ?? selected ?? 0;

    return <div className="flex flex-col items-center gap-1">
        <div className="text-sm text-orange-500/70">Rate this level</div>
        <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    className="text-2xl leading-none cursor-pointer"
                    onMouseEnter={() => setHovered(star)}
                    onClick={() => rate(star)}
                >
                    <span className={star <= displayValue ? "text-orange-500" : "text-white/20"}>★</span>
                </button>
            ))}
        </div>
        {selected !== null && <div className="text-xs text-orange-500/50">Thanks for rating!</div>}
    </div>;
};
