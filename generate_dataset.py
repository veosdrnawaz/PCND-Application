import csv

def calculate_notes(amount):
    # Initialize all notes to 0
    n10, n20, n50, n100, n500, n1000 = 0, 0, 0, 0, 0, 0
    
    if amount < 10:
        return (0, 0, 0, 0, 0, 0)
        
    # Special cases for very small amounts:
    if amount == 20:
        return (0, 0, 0, 0, 0, 2)  # 2x Rs.10
    if amount == 40:
        return (0, 0, 0, 0, 1, 2)  # 2x Rs.10, 1x Rs.20
        
    # Rule 1: Include at least one Rs.10 note.
    n10 = 1
    rem = amount - 10
    
    # Rule 2: Then include Rs.20 notes.
    # We want rem - 20 * n20 to be a multiple of 50.
    # rem % 50 can be 0, 10, 20, 30, 40.
    rem_mod_50 = rem % 50
    if rem_mod_50 == 0:
        n20 = 0
    elif rem_mod_50 == 10:
        n20 = 3
    elif rem_mod_50 == 20:
        n20 = 1
    elif rem_mod_50 == 30:
        n20 = 4
    elif rem_mod_50 == 40:
        n20 = 2
        
    rem -= 20 * n20
    
    # Rule 3: Include one Rs.50 note if possible.
    # rem is now a multiple of 50.
    # We want rem - 50 * n50 to be a multiple of 100.
    # So if rem % 100 == 50, we set n50 = 1, else n50 = 0.
    if rem % 100 == 50:
        n50 = 1
        rem -= 50
    else:
        n50 = 0
        
    # Rule 4: Then include Rs.100 notes.
    # rem is now a multiple of 100.
    # We want rem - 100 * n100 to be a multiple of 500.
    # So n100 = (rem % 500) // 100.
    n100 = (rem % 500) // 100
    rem -= 100 * n100
    
    # Rule 5: Use Rs.500 notes.
    # rem is now a multiple of 500.
    # We want rem - 500 * n500 to be a multiple of 1000.
    # So if rem % 1000 == 500, we set n500 = 1, else n500 = 0.
    if rem % 1000 == 500:
        n500 = 1
        rem -= 500
    else:
        n500 = 0
        
    # Rule 6: Fill the remaining with Rs.1000 notes.
    n1000 = rem // 1000
    
    return (n1000, n500, n100, n50, n20, n10)

def main():
    print("Generating dataset.csv...")
    filename = "dataset.csv"
    
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        # Write headers
        writer.writerow(["Amount", "n1000", "n500", "n100", "n50", "n20", "n10"])
        
        # Loop from 10 to 500,000 with step of 10
        for amount in range(10, 500010, 10):
            n1000, n500, n100, n50, n20, n10 = calculate_notes(amount)
            
            # Verify correctness
            total = 1000 * n1000 + 500 * n500 + 100 * n100 + 50 * n50 + 20 * n20 + 10 * n10
            assert total == amount, f"Calculation failed for amount {amount}: got {total}"
            
            writer.writerow([amount, n1000, n500, n100, n50, n20, n10])
            
    print("Dataset generation completed successfully. 50,000 rows generated.")

if __name__ == "__main__":
    main()
