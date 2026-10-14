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
        <div className="nv-label">Rate this level</div>
        <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    className="text-3xl leading-none cursor-pointer transition-transform hover:scale-110"
                    onMouseEnter={() => setHovered(star)}
                    onClick={() => rate(star)}
                >
                    <span className={star <= displayValue ? "text-ember" : "text-ink-600"}>★</span>
                </button>
            ))}
        </div>
        {selected !== null && <div className="nv-label text-acid">Rating saved</div>}
    </div>;
};
