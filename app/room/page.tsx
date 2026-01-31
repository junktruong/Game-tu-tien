import LobbyClient from '@/components/lobby/LobbyClient_room';
import { getGameData } from '@/lib/gameData';

export default async function HomePage() {
  const data = await getGameData();

  return <LobbyClient data={data} />;
}
