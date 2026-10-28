export type GuideLang = 'en' | 'si';

export interface GuideText {
    /** Name of the language in that language, for the language buttons. */
    nativeName: string;
    changeLanguage: string;
    title: string;
    intro: string;
    uses: { title: string; body: string; action: string; page: 'library' | 'variety' }[];
    badgesTitle: string;
    badgesIntro: string;
    syncNotice: string;
    varietyTitle: string;
    varietyBody: string;
    timeTitle: string;
    timeBody: string;
    stepsTitle: string;
    steps: string[];
    knowTitle: string;
    notes: string[];
    creditTitle: string;
    creditBody: string;
    creditButton: string;
}

export const LANGUAGE_PROMPT = 'Choose your language · ඔබේ භාෂාව තෝරන්න';

export const GUIDE: Record<GuideLang, GuideText> = {
    en: {
        nativeName: 'English',
        changeLanguage: 'Change language',
        title: 'What this app is for',
        intro:
            'Discord works out what you’re playing by looking for running programs. This app starts tiny stand-ins named like real games, so Discord shows you as playing without the game being installed.',
        uses: [
            {
                title: 'Finish Discord Quests and earn Orbs',
                body: 'Quests ask you to play a game for a set time, often 15 minutes. Start that game from the Library and leave it running. You don’t need to own it or install it.',
                action: 'Open the Library',
                page: 'library',
            },
            {
                title: 'Unlock the Game Variety badge',
                body: 'The badge asks for 100 different games. Launch 100 games with Game Variety: it plays random games one after another, one minute each by default, and fills the punch card as it goes.',
                action: 'Open Game Variety',
                page: 'variety',
            },
            {
                title: 'Raise your Game Time badge',
                body: 'Run any game you like from the Library and leave it running. Discord counts the hours as play time on your profile, which levels up your Game Time badge.',
                action: 'Open the Library',
                page: 'library',
            },
        ],
        badgesTitle: 'The two badges',
        badgesIntro:
            'Both badges have ten levels and only count detectable PC games, with Discord open. These are the levels this app helps you climb.',
        syncNotice:
            'Discord doesn’t update your badge straight away. The games you play and the hours can take up to 24 to 48 hours to show on your Discord profile.',
        varietyTitle: 'Game Variety',
        varietyBody: 'Counts how many different games you’ve played. Play 100 for the top level.',
        timeTitle: 'Game Time',
        timeBody: 'Counts the hours you’ve spent in games. Any game works, so leave one running.',
        stepsTitle: 'Getting started',
        steps: [
            'Keep the Discord desktop app open on this PC and signed in.',
            'In Discord, open Settings, then Activity Privacy, and turn on sharing your detected activity.',
            'For a Quest: accept it in Discord, find the game in the Library, press Play, and leave it running until the Quest is done.',
            'For the Game Variety badge: open Game Variety, press Start, and keep this app open until the run finishes.',
            'For the Game Time badge: start any game from the Library and leave it running for as many hours as you like.',
        ],
        knowTitle: 'Good to know',
        notes: [
            'Discord only recognises games on its own list, so search for a game by name and pick it from the results.',
            'Discord doesn’t update your badge straight away. The games you play and the hours can take up to 24 to 48 hours to show on your Discord profile.',
            'Optional: the app can’t read your badge level from Discord. If you want the levels shown here to match your profile, type the numbers from your Discord profile into the “Starting point (optional)” boxes. You can leave them at 0.',
            'The app starts tiny stand-in programs named like the real games. They sit in a games folder next to the app, and you can delete that folder any time.',
            'Library and Game Variety never run together. While one is running, the other waits.',
            'The slow default pace of Game Variety is on purpose, so it looks like normal play.',
            'This may go against Discord’s Terms of Service, so you use it at your own risk.',
        ],
        creditTitle: 'Based on an open-source project',
        creditBody:
            'This is a redesigned version of Discord Quest Completer by Mark Terence Tiglao, shared under the MIT license. The original page explains how the stand-in programs work.',
        creditButton: 'Read the original project on GitHub',
    },
    si: {
        nativeName: 'සිංහල',
        changeLanguage: 'භාෂාව වෙනස් කරන්න',
        title: 'මෙම යෙදුම භාවිතා කරන්නේ කුමකටද',
        intro:
            'ඔබ කුමන ක්‍රීඩාව සෙල්ලම් කරනවාදැයි Discord දැනගන්නේ පරිගණකයේ ක්‍රියාත්මක වන වැඩසටහන් බැලීමෙනි. මෙම යෙදුම සැබෑ ක්‍රීඩාවල නම්වලින්ම කුඩා ආදේශක වැඩසටහන් ක්‍රියාත්මක කරන නිසා, ක්‍රීඩාව ස්ථාපනය කර නොතිබුණත් Discord ඔබ එය සෙල්ලම් කරන බව පෙන්වයි.',
        uses: [
            {
                title: 'Discord Quests සම්පූර්ණ කර Orbs උපයන්න',
                body: 'Quests වලදී යම් ක්‍රීඩාවක් නියමිත වේලාවක් (බොහෝ විට මිනිත්තු 15ක්) සෙල්ලම් කළ යුතුය. Library එකෙන් ඒ ක්‍රීඩාව ආරම්භ කර ක්‍රියාත්මකව තබන්න. ක්‍රීඩාව ඔබ සතුව තිබීමක් හෝ ස්ථාපනය කිරීමක් අවශ්‍ය නැත.',
                action: 'Library විවෘත කරන්න',
                page: 'library',
            },
            {
                title: 'Game Variety badge එක අගුළු හරින්න',
                body: 'මෙම badge එක සඳහා වෙනස් ක්‍රීඩා 100ක් සෙල්ලම් කළ යුතුය. Game Variety මගින් අහඹු ක්‍රීඩා එකින් එක, පෙරනිමියෙන් මිනිත්තුවක් බැගින් සෙල්ලම් කර, ක්‍රීඩා 100ක් ආරම්භ කරයි; ඔබේ ප්‍රගතිය punch card එකේ පිරෙයි.',
                action: 'Game Variety විවෘත කරන්න',
                page: 'variety',
            },
            {
                title: 'Game Time badge එක ඉහළ නංවන්න',
                body: 'ඔබ කැමති ඕනෑම ක්‍රීඩාවක් Library එකෙන් ආරම්භ කර ක්‍රියාත්මකව තබන්න. එම පැය ගණන Discord මගින් ඔබේ profile එකේ ක්‍රීඩා කාලයට එකතු කරන අතර, එයින් ඔබේ Game Time badge එක ඉහළ යයි.',
                action: 'Library විවෘත කරන්න',
                page: 'library',
            },
        ],
        badgesTitle: 'badge දෙක',
        badgesIntro:
            'badge දෙකටම මට්ටම් දහය බැගින් ඇත. ගණන් ගන්නේ Discord විවෘතව තබා සෙල්ලම් කරන, හඳුනාගත හැකි PC ක්‍රීඩා පමණි. මෙම යෙදුම ඔබට ඉහළ නැංවීමට උදව් කරන්නේ මෙම මට්ටම්ය.',
        syncNotice:
            'Discord මගින් ඔබේ badge එක වහාම යාවත්කාලීන නොකරයි. ඔබ සෙල්ලම් කළ ක්‍රීඩා සහ පැය ඔබේ Discord profile එකේ පෙනීමට පැය 24 සිට 48 දක්වා ගත විය හැක.',
        varietyTitle: 'Game Variety',
        varietyBody: 'ඔබ සෙල්ලම් කළ වෙනස් ක්‍රීඩා ගණන ගණනය කරයි. ඉහළම මට්ටමට ක්‍රීඩා 100ක් සෙල්ලම් කරන්න.',
        timeTitle: 'Game Time',
        timeBody: 'ක්‍රීඩා සඳහා ගත කළ පැය ගණන ගණනය කරයි. ඕනෑම ක්‍රීඩාවක් ගැනේ, එබැවින් එක ක්‍රීඩාවක් ක්‍රියාත්මකව තබන්න.',
        stepsTitle: 'ආරම්භ කරන ආකාරය',
        steps: [
            'මෙම පරිගණකයේ Discord desktop යෙදුම විවෘතව තබා, ලොග් වී සිටින්න.',
            'Discord හි Settings › Activity Privacy වෙත ගොස්, ඔබ සෙල්ලම් කරන ක්‍රීඩා පෙන්වීම (detected activity) සක්‍රිය කරන්න.',
            'Quest එකක් සඳහා: Discord හි Quest එක පිළිගෙන, Library එකේ ක්‍රීඩාව සොයා Play ඔබා, Quest එක අවසන් වන තුරු ක්‍රියාත්මකව තබන්න.',
            'Game Variety badge එක සඳහා: Game Variety විවෘත කර Start ඔබා, ධාවනය අවසන් වන තුරු මෙම යෙදුම විවෘතව තබන්න.',
            'Game Time badge එක සඳහා: Library එකෙන් ඕනෑම ක්‍රීඩාවක් ආරම්භ කර, ඔබට අවශ්‍ය පැය ගණනක් ක්‍රියාත්මකව තබන්න.',
        ],
        knowTitle: 'දැනගත යුතු දේ',
        notes: [
            'Discord හඳුනාගන්නේ එහි ලැයිස්තුවේ ඇති ක්‍රීඩා පමණි. එබැවින් නමින් සොයා, ප්‍රතිඵලවලින් තෝරන්න.',
            'Discord මගින් ඔබේ badge එක වහාම යාවත්කාලීන නොකරයි. ඔබ සෙල්ලම් කළ ක්‍රීඩා සහ පැය ඔබේ Discord profile එකේ පෙනීමට පැය 24 සිට 48 දක්වා ගත විය හැක.',
            'විකල්පයකි: ඔබේ badge මට්ටම Discord වෙතින් කියවීමට මෙම යෙදුමට නොහැක. මෙහි පෙන්වන මට්ටම් ඔබේ profile එකට සමාන වීමට අවශ්‍ය නම්, ඔබේ Discord profile එකේ ඇති සංඛ්‍යා “ආරම්භක අගය (විකල්ප)” කොටුවල ඇතුළත් කරන්න. ඒවා 0 ලෙසම තැබීමටද හැක.',
            'යෙදුම සැබෑ ක්‍රීඩාවල නමින් කුඩා ආදේශක වැඩසටහන් ආරම්භ කරයි. ඒවා යෙදුම අසල ඇති games ෆෝල්ඩරයේ ගබඩා වන අතර, ඕනෑම වේලාවක ඒ ෆෝල්ඩරය මකා දැමිය හැක.',
            'Library සහ Game Variety එකවර ක්‍රියා නොකරයි. එකක් ක්‍රියාත්මක වන විට අනෙක බලා සිටී.',
            'Game Variety හි සෙමින් යන පෙරනිමි වේගය හිතාමතා තෝරාගත් එකකි; එවිට එය සාමාන්‍ය සෙල්ලම් කිරීමක් ලෙස පෙනේ.',
            'මෙය Discord හි සේවා නියමවලට පටහැනි විය හැක. එබැවින් ඔබේම වගකීමෙන් භාවිතා කරන්න.',
        ],
        creditTitle: 'විවෘත මූලාශ්‍ර ව්‍යාපෘතියක් මත පදනම්ව',
        creditBody:
            'මෙය Mark Terence Tiglao විසින් නිර්මිත Discord Quest Completer හි, MIT බලපත්‍රය යටතේ නැවත සැලසුම් කළ අනුවාදයකි. ආදේශක වැඩසටහන් ක්‍රියා කරන ආකාරය මුල් පිටුවෙන් කියවිය හැක.',
        creditButton: 'GitHub හි මුල් ව්‍යාපෘතිය කියවන්න',
    },
};
