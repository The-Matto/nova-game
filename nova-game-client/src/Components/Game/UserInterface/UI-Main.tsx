


export const GameUIMain = () => {

    const OnClickBtn = () =>{
        console.log("onclick");
    }

    return <div onClick={OnClickBtn} className="absolute bg-slate-900 p-4 rounded-xl text-3xl text-orange-500 bottom-1 right-1">Click Me!

        </div>
}