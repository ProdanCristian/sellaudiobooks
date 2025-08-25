'use client'

import Link from 'next/link'
import Image from 'next/image'


export default function Logo() {


  return (
    <Link
      href="/"
      className="flex items-center justify-center gap-1 text-foreground hover:opacity-80 transition-opacity cursor-pointer relative"
    >
      <div className="relative flex items-center gap-1">
        <span className="text-xl relative z-10 font-bold font-michroma">
          SellAudioBooks
        </span>
        <Image src="/audiobooks.svg" alt="GenViu" width={32} height={32} />
      </div>
    </Link>
  );
}