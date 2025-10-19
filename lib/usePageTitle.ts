import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export function usePageTitle() {
  const pathname = usePathname();

  const setPageTitle = (title: string) => {
    document.title = title;
  };

  const getDefaultTitle = useCallback(() => {
    switch (pathname) {
      case '/':
        return 'Listenly - 英语听力学习平台';
      case '/word':
        return '单词拼写 - Listenly';
      case '/sentence':
        return '句子听写 - Listenly';
      case '/shadowing':
        return '影子跟读 - Listenly';
      case '/my':
        return '我的 - Listenly';
      case '/admin':
        return '管理后台 - Listenly';
      default:
        return 'Listenly - 英语听力学习平台';
    }
  }, [pathname]);

  // 自动设置默认标题
  useEffect(() => {
    document.title = getDefaultTitle();
  }, [pathname, getDefaultTitle]);

  return { setPageTitle, getDefaultTitle };
}
