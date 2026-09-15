export const validateProfileData = (data = {}) => {
  const errors = {};
  const firstName = (data.firstname || '').trim();
  const lastName = (data.lastname || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();

  if (!firstName) {
    errors.firstname = 'Etunimi on pakollinen kenttä';
  }

  if (!lastName) {
    errors.lastname = 'Sukunimi on pakollinen kenttä';
  }

  if (!email) {
    errors.email = 'Sähköposti on pakollinen kenttä';
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Virheellinen sähköpostiosoite';
  }

  if (phone && !/^\+\d{7,15}$/.test(phone)) {
    errors.phone = 'Virheellinen puhelinnumero. Käytä kansainvälistä muotoa (+358401234567)';
  }

  return errors;
};
