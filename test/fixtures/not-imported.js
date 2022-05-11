import tw2 from "not-exist";
let tw = () => {};
tw`sm:bg-tomato bg-red-500`;
tw = { div: () => {} };
tw.div`sm:bg-tomato bg-red-500`;
tw2(<div />)`sm:bg-tomato bg-red-500`;
