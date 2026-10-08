/**
 * A small bundled list of the most common passwords (SECURITY.md A2; F-03). Matched against the
 * lower-cased password and against the same with leading and trailing digits and symbols stripped,
 * so `Password1234!` is refused as `password`. A short list, not a breach corpus.
 */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(
  `password passw0rd pass pa55word p4ssword admin administrator root toor login welcome letmein
   qwerty qwertyuiop qwertyuiopasdfghjkl asdfgh asdfghjkl zxcvbn zxcvbnm azerty qazwsx qazwsxedc
   1qaz2wsx 1q2w3e4r 1q2w3e 1qazxsw2 abc abcd abcde abcdef abcdefg abcdefgh abc123 abcd1234
   iloveyou iloveu ilovegod loveyou lovely love sunshine princess dragon monkey master shadow
   superman batman spiderman football baseball basketball soccer hockey tennis golf cricket
   michael jessica ashley jennifer daniel andrew joshua matthew thomas charlie robert william
   jordan hunter harley ranger buster tigger liverpool chelsea arsenal manchester barcelona
   freedom whatever trustno1 secret secure security changeme changeit default guest user test
   testing tester temp temporary demo sample example hello hello123 helloworld hellothere
   starwars pokemon matrix naruto summer winter spring autumn monday friday sunday january
   computer internet google facebook twitter youtube instagram whatsapp samsung iphone android
   windows microsoft apple linux ubuntu server database postgres mysql payload nextjs
   indies indiesgallery oldeastindies oldeast eastindies antiquemaps antiquemap gallery bali
   indonesia singapore jakarta denpasar surabaya bandung sayangku sayang cinta kamu rahasia
   katasandi sandi kunci masuk selamat selamatpagi merdeka garuda nusantara
   000000 111111 121212 123123 123321 123456 1234567 12345678 123456789 1234567890 12345678910
   654321 666666 696969 7777777 88888888 987654321 0987654321 1234qwer 1234abcd qwer1234
   passwordpassword password123456 password12345 password1234 password123
   qwertyqwerty qwerty123456 qwertyuiop123 letmein123456 welcome12345 welcome123456
   iloveyou1234 iloveyou12345 changeme1234 changemenow
   abcdefghijkl abcdefghijklm abcdefghijklmnop aaaaaaaaaaaa aaaaaaaaaaaaa
   111111111111 000000000000 123456789012 121212121212 112233445566 123412341234 1234567891011
   thequickbrownfox correcthorsebatterystaple`
    .split(/\s+/)
    .filter(Boolean),
)

/** True when the password is, or is a common word with digits or symbols added around it. */
export function isCommonPassword(password: string): boolean {
  const lowered = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lowered)) return true
  const stripped = lowered.replace(/[^a-z]+$/, '')
  if (stripped.length >= 4 && COMMON_PASSWORDS.has(stripped)) return true
  const bare = stripped.replace(/^[^a-z]+/, '')
  return bare.length >= 4 && COMMON_PASSWORDS.has(bare)
}
