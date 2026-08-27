const images = document.querySelectorAll(".gallery-image");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxTitle = document.getElementById("lightbox-title");

const closeButton = document.querySelector(".lightbox-close");
const prevButton = document.querySelector(".lightbox-prev");
const nextButton = document.querySelector(".lightbox-next");

let currentImageIndex = 0;

function showImage(index) {
    currentImageIndex = index;

    lightboxImage.src = images[currentImageIndex].src;
    lightboxTitle.textContent = images[currentImageIndex].alt;
}

images.forEach((image, index) => {
    image.addEventListener("click", () => {
        lightbox.classList.add("active");
        showImage(index);
    });
});

closeButton.addEventListener("click", () => {
    lightbox.classList.remove("active");
});

nextButton.addEventListener("click", () => {
    currentImageIndex++;

    if (currentImageIndex >= images.length) {
        currentImageIndex = 0;
    }

    showImage(currentImageIndex);
});

prevButton.addEventListener("click", () => {
    currentImageIndex--;

    if (currentImageIndex < 0) {
        currentImageIndex = images.length - 1;
    }

    showImage(currentImageIndex);
});

document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) {
        return;
    }

    if (event.key === "Escape") {
        lightbox.classList.remove("active");
    }

    if (event.key === "ArrowRight") {
        currentImageIndex++;

        if (currentImageIndex >= images.length) {
            currentImageIndex = 0;
        }

        showImage(currentImageIndex);
    }

    if (event.key === "ArrowLeft") {
        currentImageIndex--;

        if (currentImageIndex < 0) {
            currentImageIndex = images.length - 1;
        }

        showImage(currentImageIndex);
    }
});