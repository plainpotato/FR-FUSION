package collator

import (
	"encoding/json"
	"log"
	"os"
	"sync"
	"time"
)


type Record struct {
	Attendance bool `json:"attendance"`
	Detected bool `json:"detected"`
	FirstSeen time.Time `json:"firstSeen"`
	LastSeen time.Time `json:"lastSeen"`
} 


type Store struct {
	mu sync.Mutex
	Items map[string]Record `json:"personnel"`
}


type Person struct {
	Name string `json:"name"`
	Images []string `json:"images"`
}


type JsonStruct struct {
	Img_fp string `json:"img_folder_path"`
	Details []Person `json:"details"`
}


func NewStore() *Store {
	return &Store{Items: make(map[string]Record)}
}


func (store *Store) Check(name string) {
	store.mu.Lock()
	defer store.mu.Unlock()

	currTime := time.Now()

	record, exists := store.Items[name]
	if exists {
		record.Detected = true
		record.Attendance = true
		record.LastSeen = currTime

		if record.FirstSeen.IsZero() {
			record.FirstSeen = currTime
			log.Printf("%s present!", name)
		}

		store.Items[name] = record
	}
}


func (store *Store) Mark(name string) {
	store.mu.Lock()
	defer store.mu.Unlock()

	record, exists := store.Items[name] 
	if exists {
		record.Attendance = !record.Attendance
		store.Items[name] = record
	} 
}


func (store *Store) Add(name string) {
	store.mu.Lock()
	defer store.mu.Unlock()

	var initRecord Record
	initRecord.Detected = false
	initRecord.Attendance = false

	store.Items[name] = initRecord
}


func (store *Store) Clear() {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.Items = make(map[string]Record)
}


func (store *Store) JsonOut() ([]byte, error) {
	store.mu.Lock()
	defer store.mu.Unlock()

	jsonData, err := json.MarshalIndent(store.Items, "", "	")
	if err != nil {
		return nil, err
	}

	return jsonData, nil
}


func (store *Store) JsonSave(filename string) {
	jsonData, err := store.JsonOut() 
	if err != nil {
		log.Printf("Error marshaling to JSON: %v", err)
	}

	err = os.WriteFile(filename, jsonData, 0644) 
	if err != nil {
		log.Printf("Error writing to file: %v", err)
	}
}


func (store *Store) LoadJSON(bytes []byte) (error) {
	var jsonData JsonStruct

	if err := json.Unmarshal(bytes, &jsonData); err != nil {
		return err
	}

	store.Clear()

	for _, person := range jsonData.Details {
		store.Add(person.Name)
	}

	return nil
}

func (store *Store) LoadPrevOutput(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("File %s does not exists.", filename)
		} else {
			log.Printf("Error opening file: %v", err)
		}
		return
	} 

	defer file.Close()

	decoder := json.NewDecoder(file)

	store.mu.Lock()
	defer store.mu.Unlock()

	if err := decoder.Decode(&store.Items); err != nil {
		log.Printf("Error decoding JSON: %v", err)
		return
	}

	log.Printf("Loaded data from previous session")
}
