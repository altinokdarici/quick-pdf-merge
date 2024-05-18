const { PDFDocument } = PDFLib;
const pdfjsLib = window["pdfjs-dist/build/pdf"];

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.worker.min.js";

document.getElementById("uploadButton").addEventListener("click", () => {
    document.getElementById("fileInput").click();
});

document.body.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
});

document.body.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    handleFiles(files);
});

var allFiles = [];

document
    .getElementById("fileInput")
    .addEventListener("change", async (event) => {
        const files = event.target.files;
        if (files.length === 0) {
            alert("No files selected");
            return;
        }
        handleFiles(files);
    });

async function handleFiles(files) {
    const thumbnailContainer =
        document.getElementById("thumbnailContainer");

    const pdfArrayBuffers = [];

    for (const file of files) {
        allFiles.push(file);
        const arrayBuffer = await file.arrayBuffer();
        pdfArrayBuffers.push(arrayBuffer);
        const fileIndex = allFiles.length - 1;
        const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
        const numPages = pdfDoc.numPages;

        for (let i = 0; i < numPages; i++) {
            const page = await pdfDoc.getPage(i + 1);
            const viewport = page.getViewport({ scale: 0.25 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport }).promise;

            const thumbnailElement = document.createElement("div");
            thumbnailElement.className = "thumbnail";
            thumbnailElement.dataset.pageIndex = i;
            thumbnailElement.dataset.fileIndex = fileIndex;
            const img = document.createElement("img");
            img.src = canvas.toDataURL();

            // Create the "X" button
            const removeButton = document.createElement("button");
            removeButton.className = "remove-btn";
            removeButton.textContent = "x";
            thumbnailElement.appendChild(removeButton);

            // Add event listener to remove button
            removeButton.addEventListener("click", (e) => {
                e.stopPropagation();
                thumbnailElement.remove(); // Remove the thumbnail element
                if (thumbnailContainer.childNodes.length === 0) {
                    document.getElementById("downloadButton").style.display =
                        "none";
                }
            });

            thumbnailElement.appendChild(img);
            thumbnailContainer.appendChild(thumbnailElement);

            // Add click event listener to show larger image in modal
            thumbnailElement.addEventListener("click", async () => {
                const modal = document.getElementById("modal");
                const modalImage = document.getElementById("modalImage");

                // Get the file index and page index from the thumbnail element
                const fileIndex = thumbnailElement.dataset.fileIndex;
                const pageIndex = thumbnailElement.dataset.pageIndex;

                // Load the corresponding PDF document
                const arrayBuffer = await allFiles[fileIndex].arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer })
                    .promise;

                // Get the page
                const page = await pdfDoc.getPage(Number(pageIndex) + 1);

                // Render the page at a higher scale for better resolution
                const scale = 2; // Adjust the scale as needed
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                await page.render(renderContext).promise;

                // Update the modal image source with the rendered canvas
                modalImage.src = canvas.toDataURL();
                modal.style.display = "flex";
            });
        }
    }

    document.getElementById("downloadButton").style.display =
        "inline-block";

    // Make the thumbnails sortable
    new Sortable(thumbnailContainer, {
        animation: 150,
    });
}

document
    .getElementById("downloadButton")
    .addEventListener("click", async () => {
        const thumbnailContainer =
            document.getElementById("thumbnailContainer");
        const thumbnails = Array.from(thumbnailContainer.children);

        const mergedPdf = await PDFDocument.create();

        for (const thumbnail of thumbnails) {
            const fileIndex = thumbnail.dataset.fileIndex;
            const pageIndex = thumbnail.dataset.pageIndex;

            const arrayBuffer = await allFiles[fileIndex].arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const [page] = await mergedPdf.copyPages(pdfDoc, [
                Number(pageIndex),
            ]);
            mergedPdf.addPage(page);
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "merged.pdf";
        downloadLink.click();

        // Clear the state after download
        clearState();
    });

// Close modal when close button is clicked
document.querySelector(".modal .close").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
});

// Close modal when clicking outside the modal content
window.addEventListener("click", (event) => {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

function clearState() {
    document.getElementById("fileInput").value = "";
    document.getElementById("thumbnailContainer").innerHTML = "";
    document.getElementById("downloadButton").style.display = "none";
}