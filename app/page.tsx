import Header from "@/components/Header/Header";
import Hero from "@/components/Hero/Hero";
import Servicios from "@/components/Servicios/Servicios";
import Nosotros from "@/components/Nosotros/Nosotros";
import Testimonios from "@/components/Testimonios/Testimonios";
import Contacto from "@/components/Contacto/Contacto";
import Footer from "@/components/Footer/Footer";
import { absoluteUrl, siteName } from "@/lib/seo";
import styles from "./page.module.css";

export default function Home() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: siteName,
    url: absoluteUrl("/"),
    image: absoluteUrl("/reserva.jpg"),
    logo: absoluteUrl("/Logo.PNG"),
    telephone: "+59177411855",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cochabamba",
      addressCountry: "BO",
    },
    areaServed: "Cochabamba, Bolivia",
    sameAs: ["https://instagram.com/atrevida.fit"],
    makesOffer: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Tratamientos corporales y faciales",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Evaluacion estetica gratuita",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <Header />
      <main className={styles.landingMain}>
        <Hero />
        <Servicios />
        <Nosotros />
        <Contacto />
        <Testimonios />
      </main>
      <Footer />
    </>
  );
}
