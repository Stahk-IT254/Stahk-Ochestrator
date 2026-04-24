import os
import chromadb

def populate_chromadb():
    print("Initializing ChromaDB Persistent Client...")
    # Initialize ChromaDB in a local directory
    db_path = os.path.join(os.path.dirname(__file__), "chroma_db")
    client = chromadb.PersistentClient(path=db_path)
    
    # Get or create the main knowledge collection
    collection = client.get_or_create_collection(name="stahk_knowledge")
    
    kb_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_base")
    if not os.path.exists(kb_dir):
        print(f"Directory not found: {kb_dir}")
        return

    documents = []
    metadatas = []
    ids = []

    print("Reading markdown files...")
    for file_name in os.listdir(kb_dir):
        if file_name.endswith(".md"):
            domain = file_name.replace(".md", "")
            file_path = os.path.join(kb_dir, file_name)
            
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # For MVP, we treat each file as one big document. 
            # In production, we would chunk this into smaller pieces.
            documents.append(content)
            metadatas.append({"domain": domain, "source": file_name})
            ids.append(f"doc_{domain}")
            print(f" - Loaded {file_name} (Domain: {domain})")

    if documents:
        print(f"Adding {len(documents)} documents to ChromaDB collection...")
        collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print("Success! ChromaDB populated.")
    else:
        print("No markdown files found to process.")

if __name__ == "__main__":
    populate_chromadb()
