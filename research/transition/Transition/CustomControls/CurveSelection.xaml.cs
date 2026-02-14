using Easycoustics.Transition.CurveLibrary;
using Easycoustics.Transition.Design;
using Easycoustics.Transition.Functions;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CustomControls
{
    public sealed partial class CurveSelection : UserControl
    {
        public CurveSelection()
        {
            this.InitializeComponent();

            var systemCurveLibrary = UserDesign.CurrentDesign.SystemCurves;
            var userCurveLibrary = UserDesign.CurrentDesign.UserCurves;

            treeSystemCurves.ItemsSource = systemCurveLibrary.Children;
            treeUserCurves.ItemsSource = userCurveLibrary.Children;
        }

        public CurveSelection(List<Function> AlreadySelected)
        {
            this.InitializeComponent();


            var systemCurveLibrary = UserDesign.CurrentDesign.SystemCurves;
            var userCurveLibrary = UserDesign.CurrentDesign.UserCurves;


            treeSystemCurves.ItemsSource = systemCurveLibrary.Children;
            treeUserCurves.ItemsSource = userCurveLibrary.Children;

            var items1 = new List<LibraryItem>();
            var items2 = new List<LibraryItem>();

            foreach (var func in AlreadySelected)
            {
                if (systemCurveLibrary.GetItem(func) != null)
                    items1.Add(systemCurveLibrary.GetItem(func));

                if (userCurveLibrary.GetItem(func) != null)
                    items2.Add(userCurveLibrary.GetItem(func));
            }

            List<TreeViewNode> l;
            foreach (var item in items1)
            {
                l = treeSystemCurves.RootNodes.Cast<TreeViewNode>().Where(n => n.Content == item).ToList();
                if (l.Count > 0) treeSystemCurves.SelectedNodes.Add(l.First());
            }


        }

        public TreeViewNode getNode(List<TreeViewNode> nodes, LibraryItem item)
        {
            foreach (TreeViewNode node in nodes)
            {
                if (node.Content == item) return node;
                return getNode(node.Children.ToList(), item);
            }
            return null;
        }

        public List<Function> selectedCurves()
        {
            var output = new List<Function>();

            foreach (var node in treeSystemCurves.SelectedNodes)
                if (node.Content is LibraryItem)
                    output.Add(((LibraryItem)node.Content).Curve);

            return output;
        }
    }

    public class ExplorerItemTemplateSelector : DataTemplateSelector
    {
        public DataTemplate FolderTemplate { get; set; }
        public DataTemplate FileTemplate { get; set; }

        protected override DataTemplate SelectTemplateCore(object item)
        {
            var explorerItem = (LibraryBase)item;
            if (explorerItem is LibraryFolder) return FolderTemplate;

            return FileTemplate;
        }
    }
}
