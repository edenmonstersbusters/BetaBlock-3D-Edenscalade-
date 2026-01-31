
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// RESSOURCES DE TRADUCTION
// Note: Le texte FR correspond exactement au texte actuel pour éviter toute régression.

const resources = {
  fr: {
    translation: {
      hero: {
        title: "BetaBlock",
        subtitle: "La plateforme communautaire des ouvreurs. Explorez les créations publiques ou gérez vos projets privés.",
        create_new: "Créer un Nouveau Mur",
        my_private_walls: "Mes Murs Privés"
      },
      viewer: {
        back_home: "Retour à la Galerie",
        remix_project: "Projet Remixé",
        inspired_by: "Inspiré par",
        created_by: "Créé par",
        date: "Date",
        edit_my_wall: "Modifier mon mur",
        remix_this_wall: "Remixer ce mur",
        share: "Partager",
        comments_beta: "Commentaires & Bétas"
      },
      stats: {
        analysis: "Analyse du Mur",
        holds: "Prises",
        segments: "Pans",
        height: "Hauteur",
        linear: "Linéaire",
        width: "Largeur",
        overhang: "Max Dévers"
      },
      seo: {
        viewer_description: "Découvrez ce mur d'escalade 3D créé par {{author}}. {{count}} prises, {{height}}m de haut. Difficulté estimée : {{difficulty}}.",
        difficulty_expert: "Expert",
        difficulty_intermediate: "Intermédiaire",
        breadcrumb_home: "Accueil",
        breadcrumb_gallery: "Galerie",
        breadcrumb_wall: "Mur"
      }
    }
  },
  en: {
    translation: {
      hero: {
        title: "BetaBlock",
        subtitle: "The community platform for route setters. Explore public creations or manage your private projects.",
        create_new: "Create New Wall",
        my_private_walls: "My Private Walls"
      },
      viewer: {
        back_home: "Back to Gallery",
        remix_project: "Remixed Project",
        inspired_by: "Inspired by",
        created_by: "Created by",
        date: "Date",
        edit_my_wall: "Edit my wall",
        remix_this_wall: "Remix this wall",
        share: "Share",
        comments_beta: "Comments & Beta"
      },
      stats: {
        analysis: "Wall Analysis",
        holds: "Holds",
        segments: "Segments",
        height: "Height",
        linear: "Linear",
        width: "Width",
        overhang: "Max Overhang"
      },
      seo: {
        viewer_description: "Discover this 3D climbing wall created by {{author}}. {{count}} holds, {{height}}m high. Estimated difficulty: {{difficulty}}.",
        difficulty_expert: "Expert",
        difficulty_intermediate: "Intermediate",
        breadcrumb_home: "Home",
        breadcrumb_gallery: "Gallery",
        breadcrumb_wall: "Wall"
      }
    }
  },
  es: {
    translation: {
      hero: {
        title: "BetaBlock",
        subtitle: "La plataforma comunitaria para route setters. Explora creaciones públicas o gestiona tus proyectos privados.",
        create_new: "Crear Nuevo Muro",
        my_private_walls: "Mis Muros Privados"
      },
      viewer: {
        back_home: "Volver a la Galería",
        remix_project: "Proyecto Remix",
        inspired_by: "Inspirado por",
        created_by: "Creado por",
        date: "Fecha",
        edit_my_wall: "Editar mi muro",
        remix_this_wall: "Remezclar este muro",
        share: "Compartir",
        comments_beta: "Comentarios y Betas"
      },
      stats: {
        analysis: "Análisis del Muro",
        holds: "Presas",
        segments: "Paneles",
        height: "Altura",
        linear: "Lineal",
        width: "Ancho",
        overhang: "Desplome Máx"
      },
      seo: {
        viewer_description: "Descubre este muro de escalada 3D creado por {{author}}. {{count}} presas, {{height}}m de altura. Dificultad estimada: {{difficulty}}.",
        difficulty_expert: "Experto",
        difficulty_intermediate: "Intermedio",
        breadcrumb_home: "Inicio",
        breadcrumb_gallery: "Galería",
        breadcrumb_wall: "Muro"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr', // Langue par défaut si non détectée
    debug: false,
    interpolation: {
      escapeValue: false, // React protège déjà du XSS
    }
  });

export default i18n;
