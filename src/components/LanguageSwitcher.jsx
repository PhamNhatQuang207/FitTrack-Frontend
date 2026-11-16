import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { userAPI } from '../api';

/**
 * Toggles the active UI language between English ('en') and Vietnamese ('vi'),
 * persisting the preference to the backend when a user is authenticated.
 */
const LanguageSwitcher = ({ className = '' }) => {
    const { i18n } = useTranslation();
    const auth = useContext(AuthContext);
    const user = auth?.user;
    const updateUser = auth?.updateUser;

    const currentLang = i18n.resolvedLanguage === 'vi' ? 'vi' : 'en';
    const nextLang = currentLang === 'en' ? 'vi' : 'en';

    const handleToggle = async () => {
        await i18n.changeLanguage(nextLang);
        if (user && updateUser) {
            updateUser({ preferredLanguage: nextLang });
            try {
                await userAPI.updateLanguage(nextLang);
            } catch {
                // Best-effort persistence; local language state is already updated.
            }
        }
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            aria-label={currentLang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
        >
            {currentLang === 'en' ? 'EN' : 'VI'}
        </button>
    );
};

export default LanguageSwitcher;
