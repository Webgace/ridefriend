// Ficheiro: src/utils/invite.ts | Função: gera o URL de convite a partilhar com amigos
// O domínio ridefriend.app ainda não tem landing page nem Universal/App Links configurados,
// por isso apontamos para a Play Store (referrer com o userId). Quando o domínio for
// servido com `.well-known/assetlinks.json` (Android) e `apple-app-site-association` (iOS),
// substituir por `https://ridefriend.app/invite/${userId}` e adicionar intent-filter https.

const PLAY_STORE_BASE = 'https://play.google.com/store/apps/details';
const ANDROID_PACKAGE = 'com.friendride.app';

export function getInviteUrl(userId?: string | null): string {
  const params = new URLSearchParams({ id: ANDROID_PACKAGE });
  if (userId) params.set('referrer', `invite_${userId}`);
  return `${PLAY_STORE_BASE}?${params.toString()}`;
}
