const Dictation = () => {
  // 垂直居中展示，header有64px高度需要减掉，否则有一个64px滚动区域
  return (
    <div className="flex justify-center items-center h-screen minus-header">
      <div className="text-center text-2xl font-bold">Coming soon...</div>
    </div>
  );
};

export default Dictation;
