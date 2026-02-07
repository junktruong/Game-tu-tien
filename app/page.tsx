import LobbyClient from '../components/lobby/LobbyClient';
import { getGameData } from '../lib/gameData';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getGameData();

  return <LobbyClient data={data} />;
}
