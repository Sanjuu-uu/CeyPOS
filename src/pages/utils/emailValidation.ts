// Comprehensive list of temporary/disposable email domains
const TEMP_EMAIL_DOMAINS = [
  // Common temp mail services
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'mailinator.com',
  'trashmail.com', '10minutemail.com', 'throwaway.email', 'getnada.com',
  'maildrop.cc', 'fakeinbox.com', 'yopmail.com', 'temp-mail.io',
  'dispostable.com', 'throwawaymail.com', 'tempinbox.com', 'mintemail.com',
  'sharklasers.com', 'guerrillamail.info', 'grr.la', 'guerrillamail.biz',
  'guerrillamail.de', 'spam4.me', 'mailcatch.com', 'emailondeck.com',
  'tempr.email', 'getairmail.com', 'temp-mail.de', 'mohmal.com',
  'mytemp.email', 'armyspy.com', 'cuvox.de', 'dayrep.com', 'einrot.com',
  'fleckens.hu', 'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com',
  'teleworm.us', 'arqsis.com', // Added arqsis.com as per your example
  
  // Additional temp mail services
  'mailnesia.com', 'mailforspam.com', 'spambox.us', 'spamgourmet.com',
  'incognitomail.org', 'anonymbox.com', 'trashmail.ws', 'mytrashmail.com',
  'tempsky.com', 'tmpeml.info', 'email-temp.com', 'classesmail.com',
  'maildax.com', 'spamfree24.org', 'spamfree24.com', 'spamfree24.eu',
  'emailfake.com', 'fake-box.com', 'fake-email.com', 'disposable-email.ml',
  'disposable.com', 'disposemail.com', 'anonmails.de', 'anonymail.dk',
  'bugmenot.com', 'deadaddress.com', 'despam.it', 'discardmail.com',
  'dontreg.com', 'filzmail.com', 'gishpuppy.com', 'jetable.org',
  'link2mail.net', 'mp3c.ws', 'nobulk.com', 'nospam.ze.tc',
  'nowmymail.com', 'oneoffemail.com', 'pookmail.com', 'qq.my',
  'rejectmail.com', 'rtrtr.com', 's0ny.net', 'safe-mail.net',
  'selfdestructingmail.com', 'shiftmail.com', 'shortmail.net', 'sibmail.com',
  'skeefmail.com', 'slapsfromlastnight.com', 'slaskpost.se', 'slipry.net',
  'sneakemail.com', 'sofimail.com', 'sogetthis.com', 'soodonims.com',
  'spam.la', 'spamavert.com', 'spambob.com', 'spambog.com',
  'spamcorptastic.com', 'spamex.com', 'spamherelots.com', 'spamhereplease.com',
  'spamthisplease.com', 'speed.1s.fr', 'spoofmail.de', 'supergreatmail.com',
  'suremail.info', 'teewars.org', 'tempemail.biz', 'tempemail.com',
  'tempinbox.co.uk', 'tempomail.fr', 'temporarily.de', 'tempymail.com',
  'thankyou2010.com', 'thisisnotmyrealemail.com', 'tradermail.info', 'trash-amil.com',
  'trash2009.com', 'trashemail.de', 'trashymail.com', 'tyldd.com',
  'uggsrock.com', 'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'wh4f.org', 'whyspam.me', 'willselfdestruct.com', 'winemaven.info',
  'wronghead.com', 'www.e4ward.com', 'www.mailinator.com', 'wwwnew.eu',
  'xagloo.com', 'xemaps.com', 'xents.com', 'yroid.com',
  'zetmail.com', 'zoaxe.com', 'zoemail.org', 'zomg.info','illubd.com',
  'arqsis.com','binkmail.com','crazymailing.com','devnullmail.com','emailtemporanea.com',
  'emailtemporar.ro','fakeemailgenerator.com','gettempmail.com','inboxbear.com','instantemailaddress.com',
  'mail-temporaire.fr','mailcatch.com','my10minutemail.com','nowmymail.net','temp-mail.pro','tempail.com',
  'tempe-mail.com','tempemail.co','tempemail.net','tempomail.io','yopmail.fr'
];

/**
 * Validates if an email address is from a temporary/disposable email service
 * @param email - The email address to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Extract domain from email
  const domain = trimmedEmail.split('@')[1];

  // Check if domain is in temp email list
  if (TEMP_EMAIL_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.' 
    };
  }

  return { isValid: true };
}

/**
 * Checks if a domain is a known temporary email provider
 * @param domain - The domain to check
 * @returns boolean indicating if domain is temporary
 */
export function isTempEmailDomain(domain: string): boolean {
  return TEMP_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

/**
 * Validates email and returns a formatted error message for UI
 * @param email - The email address to validate
 * @returns Error message string or null if valid
 */
export function getEmailValidationError(email: string): string | null {
  const result = validateEmail(email);
  return result.isValid ? null : (result.error || 'Invalid email address');
}