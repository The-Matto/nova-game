

export const VirtualCursor = () => {

    return <>
        <div className="absolute bg-green-400 rounded-2xl" id={"virtual-cursor"} style={{
            transform: `translate(${50}px, ${150}px)`
        }}> Cursor </div>

    </>
}