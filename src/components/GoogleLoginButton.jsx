import React, { useEffect, useRef } from 'react';

const GSI_SCRIPT_ID = 'google-identity-services';

export default function GoogleLoginButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    const initButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else if (onError) {
            onError(new Error('Google sign-in did not return a credential'));
          }
        },
      });
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: '350',
        text: 'continue_with',
      });
    };

    if (window.google?.accounts?.id) {
      initButton();
      return;
    }

    let script = document.getElementById(GSI_SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = GSI_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', initButton);
    return () => script.removeEventListener('load', initButton);
  }, [clientId, onSuccess, onError]);

  if (!clientId) return null;

  return (
    <div className="mt-4 flex justify-center">
      <div ref={buttonRef} />
    </div>
  );
}
