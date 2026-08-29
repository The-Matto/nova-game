//Persistent way back to the portfolio site - shown on every screen (main menu, editor,
//gameplay, even over a modal), replacing the browser's own nav bar the fullscreen canvas hides.
export const HomeLink = () => (
    <a
        href="https://mattheritage.dev/"
        className="fixed top-2 left-2 z-40 text-white text-base hover:text-orange-300 hover:underline"
    >
        ← mattheritage.dev
    </a>
);
