import Header from "@/components/Header/Header";
import Hero from "@/components/Hero/Hero";
import Servicios from "@/components/Servicios/Servicios";
import Nosotros from "@/components/Nosotros/Nosotros";
import Testimonios from "@/components/Testimonios/Testimonios";
import Contacto from "@/components/Contacto/Contacto";
import Footer from "@/components/Footer/Footer";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
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
