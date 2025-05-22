export default function Footer() {
  return (
    <footer className="w-full py-4 text-center text-sm text-gray-500 border-t">
      <div className="container mx-auto flex justify-center items-center gap-4">
        <p className="mb-1">
          Copyright © 2025-{new Date().getFullYear()} Listenly. All rights reserved.
        </p>
        <p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700"
          >
            鄂ICP备2023019395号-2
          </a>
        </p>
      </div>
    </footer>
  );
}