using Easycoustics.Transition.Functions;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition.CurveLibrary
{
    public class LibraryFolder : LibraryBase
    {
        public override ObservableCollection<LibraryBase> Children { get; } = new ObservableCollection<LibraryBase>();
        public override string Title { get => FolderName; }

        public string FolderName { get; set; }

        
        public LibraryFolder(string name)
        {
            FolderName = name;
            Children.CollectionChanged += Items_CollectionChanged;
        }

        private void Items_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            switch (e.Action)
            {
                case NotifyCollectionChangedAction.Add: break;
                case NotifyCollectionChangedAction.Remove: break;
                case NotifyCollectionChangedAction.Reset: break;
            }
        }

        public void AddIfNotAdded(Function func)
        {
            if (IsAdded(func)) return;
            
            Children.Add(new LibraryItem() { Curve = func });
        }

        private bool IsAdded(Function func)
        {
            foreach (var item in Children.OfType<LibraryItem>())
                if (func == item.Curve) return true;

            return false;
        }

        public override void submitCurvesChange()
        {
            foreach (var item in Children)
                item.submitCurvesChange();
        }

        public void Clear()
        {
            Children.Clear();
        }

        public override LibraryItem GetItem(Function func)
        {
            foreach (LibraryBase item in Children)
                if (item.GetItem(func) != null)
                    return item.GetItem(func);



            return null;
        }
    }
}
