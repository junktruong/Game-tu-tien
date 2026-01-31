import Script from 'next/script';
import HomeClient from '../../components/home/HomeClient';
import { getGameData } from '../../lib/gameData';
import './home.css';

export const metadata = {
  title: 'Trang chủ - Tu Tiên Fight',
};

export default async function HomePage() {
  const data = await getGameData();

  return (
    <main className="home-main">
      <HomeClient data={data} />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        strategy="beforeInteractive"
      />
      <Script type="module" src="/js/profile/main.js" strategy="afterInteractive" />
    </main>
  );
}
