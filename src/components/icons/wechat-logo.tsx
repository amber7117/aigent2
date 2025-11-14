import type { SVGProps } from 'react';

export function WeChatLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 9.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
      <path d="M9.5 9.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
      <path d="M21 11.5c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c1.4 0 2.7.4 3.9 1.1l1.6-1.6c-1.5-1-3.4-1.5-5.5-1.5-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-1.7-4-4.2-5.8" />
    </svg>
  );
}
